/**
 * Creates a payment intent with Uprails. If a `redemption_token` is
 * provided (issued by /functions/v1/redeem-promo), the discount the
 * client claims is cross-checked against the signed payload, and the
 * server-verified subtotal − discount is what gets sent to Uprails.
 *
 * Body (all amounts in pence):
 *   { amount, currency?, description?, email?, customer_id?, metadata?,
 *     redemption_token?, subtotal? }
 *
 * If `redemption_token` is provided:
 *   - HMAC is verified against PROMO_SIGNING_SECRET
 *   - `subtotal` from the request must equal the token's subtotal_pence
 *     (so the client can't swap in a smaller cart after issuing the token)
 *   - Final amount is server-recomputed as (subtotal − discount)
 *   - The promo metadata is stamped on the Uprails payment so the
 *     uprails-webhook can finalize the redemption on payment.succeeded
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { verifyRedemptionToken } from '../_shared/redemption-token.ts'

const UPRAILS_API_URL = 'https://api.uprails.com/payments'

interface CreatePaymentBody {
  amount: number
  currency?: string
  description?: string
  email?: string
  customer_id?: string
  metadata?: Record<string, string>
  redemption_token?: string
  subtotal?: number
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const apiKey = Deno.env.get('UPRAILS_SECRET_KEY')
    const profileId = Deno.env.get('UPRAILS_PROFILE_ID')
    if (!apiKey || !profileId) {
      console.error('[create-payment] missing UPRAILS_SECRET_KEY or UPRAILS_PROFILE_ID')
      return jsonResponse({ error: 'Server not configured' }, 500)
    }

    const body: CreatePaymentBody = await req.json()
    if (!body.amount || body.amount <= 0) {
      return jsonResponse({ error: 'Invalid amount' }, 400)
    }

    let finalAmount = body.amount
    const metadata: Record<string, string> = { ...(body.metadata ?? {}) }

    if (body.redemption_token) {
      const verified = await verifyRedemptionToken(body.redemption_token)
      if (!verified) {
        return jsonResponse({ error: 'Promo token invalid or expired' }, 400)
      }
      if (!body.subtotal || body.subtotal !== verified.subtotal_pence) {
        // Cart changed between redeem-promo and pay — reject to force a fresh token.
        return jsonResponse({ error: 'Cart changed, re-apply promo code' }, 400)
      }
      finalAmount = Math.max(0, verified.subtotal_pence - verified.discount_pence)
      metadata.promo_code = verified.code
      metadata.promo_id = verified.promo_id
      metadata.promo_type = verified.type
      metadata.promo_discount_pence = String(verified.discount_pence)
      metadata.promo_brand = verified.brand
    }

    const uprailsPayload = {
      amount: finalAmount,
      currency: body.currency || 'GBP',
      profile_id: profileId,
      confirm: false,
      description: body.description || 'Order',
      ...(body.email && { email: body.email }),
      ...(body.customer_id && { customer_id: body.customer_id }),
      metadata,
    }

    const uprailsRes = await fetch(UPRAILS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(uprailsPayload),
    })

    const data = await uprailsRes.json()

    if (!uprailsRes.ok) {
      console.error('[create-payment] Uprails API error:', data)
      return jsonResponse({ error: 'Payment creation failed', details: data }, uprailsRes.status)
    }

    return jsonResponse({
      clientSecret: data.client_secret,
      paymentId: data.payment_id,
      status: data.status,
      finalAmount,
    })
  } catch (err) {
    console.error('[create-payment] uncaught:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
