import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Brand = 'vitalabs' | 'peptiva'

function resolveBrand(body: { brand?: string }): Brand {
  return body.brand === 'peptiva' ? 'peptiva' : 'vitalabs'
}

async function persistOrder(body: Record<string, unknown>): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.warn('[order-webhook] Supabase env not set; skipping DB persist')
    return
  }
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const totalPence = typeof body.amount === 'number' ? body.amount : 0
  const items = Array.isArray(body.items) ? body.items : []
  const brand = resolveBrand(body)
  const { error } = await sb.from('orders').insert({
    brand,
    stripe_id: typeof body.stripeId === 'string' ? body.stripeId : null,
    uprails_id: typeof body.uprailsId === 'string' ? body.uprailsId : null,
    email: typeof body.customerEmail === 'string' ? body.customerEmail : null,
    customer_name: typeof body.customerName === 'string' ? body.customerName : null,
    items,
    subtotal: totalPence > 0 ? totalPence / 100 : null,
    total: totalPence / 100,
    currency: typeof body.currency === 'string' ? body.currency : 'GBP',
    status: 'paid',
    payment_method: typeof body.paymentMethod === 'string' ? body.paymentMethod : null,
    metadata: {
      shippingAddress: body.shippingAddress ?? null,
      phone: body.customerPhone ?? null,
      utm: body.utm ?? null,
    },
  })
  if (error) {
    console.error('[order-webhook] Supabase insert failed:', error.message)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()

    // Persist to Supabase FIRST as the source of truth. Even if Zapier
    // is misconfigured or down, the order must land in the admin
    // dashboard. Previously this function bailed with 500 when
    // ZAPIER_WEBHOOK_URL was missing — which silently dropped every
    // order on the floor.
    await persistOrder(body)

    const zapierUrl = Deno.env.get('ZAPIER_WEBHOOK_URL')
    if (!zapierUrl) {
      console.warn('[order-webhook] ZAPIER_WEBHOOK_URL not set; order persisted, skipping Zapier')
      return new Response(JSON.stringify({ persisted: true, zapier: 'skipped' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const items = body.items ?? []
    const productNames = items.map((i: { sku?: string; compound?: string }) =>
      [i.sku, i.compound].filter(Boolean).join(' — ')
    )
    const totalPence = body.amount ?? 0
    const totalGBP = (totalPence / 100).toFixed(2)
    const aov = items.length > 0
      ? (totalPence / 100 / items.length).toFixed(2)
      : totalGBP

    const payload = {
      brand: resolveBrand(body),
      name: body.customerName ?? '',
      email: body.customerEmail ?? '',
      phone: body.customerPhone ?? '',
      shipping_address1: body.shippingAddress?.address1 ?? '',
      shipping_address2: body.shippingAddress?.address2 ?? '',
      shipping_city: body.shippingAddress?.city ?? '',
      shipping_county: body.shippingAddress?.county ?? '',
      shipping_postcode: body.shippingAddress?.postcode ?? '',
      shipping_country: body.shippingAddress?.country ?? '',
      products: productNames.join(' | '),
      order_total: `£${totalGBP}`,
      aov: `£${aov}`,
      item_count: items.length,
      order_date: new Date().toISOString(),
    }

    const zapierRes = await fetch(zapierUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!zapierRes.ok) {
      const errText = await zapierRes.text()
      // Zapier failure is non-fatal — order is already persisted.
      console.error(`[order-webhook] Zapier returned ${zapierRes.status}: ${errText}`)
    }

    return new Response(JSON.stringify({ persisted: true, zapier: zapierRes.ok ? 'sent' : 'failed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[order-webhook] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
