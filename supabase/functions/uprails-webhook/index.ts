/**
 * Receives Uprails webhook events. On payment.succeeded:
 *   1. Insert (or upsert) a row in `orders` with status='paid'
 *   2. If the payment metadata contains a promo_code, increment that
 *      promo's `uses` counter atomically (one redemption finalized).
 *
 * On payment.failed:
 *   - Insert a row with status='failed' so the admin can see drop-offs.
 *
 * Other events are logged but not yet processed.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

interface UprailsEvent {
  type?: string
  event_type?: string
  data?: {
    payment_id?: string
    amount?: number
    currency?: string
    description?: string
    email?: string
    customer_name?: string
    metadata?: Record<string, string>
    error?: { message?: string }
  }
  payment_id?: string
}

function getSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

async function recordOrder(
  supabase: SupabaseClient,
  status: 'paid' | 'failed',
  data: NonNullable<UprailsEvent['data']>,
) {
  const md = data.metadata ?? {}
  const brand = (md.promo_brand || md.brand || 'vitalabs') as 'vitalabs' | 'peptiva'

  // Amount returned by Uprails is the actual amount charged in pence;
  // store in pounds to match the orders table's numeric(10,2).
  const totalPounds = data.amount ? Number(data.amount) / 100 : 0

  const items: unknown[] = []
  if (md.items) {
    try { items.push(...JSON.parse(md.items)) } catch { /* ignore */ }
  }

  const row = {
    brand,
    uprails_id: data.payment_id ?? null,
    email: data.email ?? md.email ?? null,
    customer_name: data.customer_name ?? md.customer_name ?? null,
    items,
    total: totalPounds,
    currency: data.currency ?? 'GBP',
    status,
    payment_method: 'uprails',
    metadata: md,
  }

  // Upsert on uprails_id so duplicate webhook deliveries are idempotent.
  const { error } = await supabase
    .from('orders')
    .upsert(row, { onConflict: 'uprails_id' })

  if (error) console.error('[uprails-webhook] order upsert failed:', error)
}

async function finalizePromoRedemption(
  supabase: SupabaseClient,
  promoId: string | undefined,
) {
  if (!promoId) return
  // Atomically increment `uses` for the promo. We use a postgres
  // function rpc if available, otherwise fall back to a read-modify-write.
  const { error } = await supabase.rpc('increment_promo_uses', { p_id: promoId })
  if (error) {
    console.warn('[uprails-webhook] increment_promo_uses rpc failed, falling back:', error.message)
    const { data: cur } = await supabase
      .from('promo_codes')
      .select('uses')
      .eq('id', promoId)
      .maybeSingle()
    if (cur) {
      await supabase
        .from('promo_codes')
        .update({ uses: (cur.uses ?? 0) + 1 })
        .eq('id', promoId)
    }
  }
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const event = (await req.json()) as UprailsEvent
    const eventType = event.type || event.event_type
    const paymentId = event.data?.payment_id || event.payment_id

    console.log(`[uprails-webhook] event=${eventType} payment=${paymentId}`)

    const supabase = getSupabase()

    switch (eventType) {
      case 'payment.succeeded':
        if (event.data) {
          await recordOrder(supabase, 'paid', event.data)
          await finalizePromoRedemption(supabase, event.data.metadata?.promo_id)
        }
        break

      case 'payment.failed':
        if (event.data) {
          await recordOrder(supabase, 'failed', event.data)
        }
        console.log(`Payment ${paymentId} failed — ${event.data?.error?.message ?? 'no reason'}`)
        break

      case 'payment.requires_action':
        console.log(`Payment ${paymentId} requires additional action (3DS)`)
        break

      default:
        console.log(`Unhandled event: ${eventType}`)
    }

    return jsonResponse({ received: true })
  } catch (err) {
    console.error('[uprails-webhook] uncaught:', err)
    return jsonResponse({ error: 'Webhook processing failed' }, 500)
  }
})
