/**
 * Validates a promo code server-side against the requested brand and
 * subtotal, then returns a short-lived HMAC-signed redemption token.
 *
 * The token is passed through `create-payment` (which re-verifies the
 * HMAC) and finally landed in `uprails-webhook` (which increments the
 * promo's `uses` counter after payment succeeds). This means:
 *
 * 1. Bogus codes / expired codes / over-cap codes are rejected here.
 * 2. The discount the client displays is the discount the server signed.
 * 3. A user can't mutate the discount in devtools — `create-payment`
 *    re-derives the final amount from the signed payload.
 * 4. `uses` only increments after a real payment confirms, not on
 *    every validation attempt.
 *
 * Body: { brand, code, subtotal_pence }
 * Returns: { ok, discount_pence?, token?, type?, error? }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { signRedemptionToken } from '../_shared/redemption-token.ts'

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface RequestBody {
  brand: 'vitalabs' | 'peptiva'
  code: string
  subtotal_pence: number
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = (await req.json()) as RequestBody
    if (!body.brand || !body.code) return jsonResponse({ ok: false, error: 'brand and code required' }, 400)
    if (!body.subtotal_pence || body.subtotal_pence <= 0) return jsonResponse({ ok: false, error: 'invalid subtotal' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      // Service-role key bypasses RLS so we can read the promo regardless of
      // its `active` flag (we want to return a clear "inactive" error rather
      // than a generic "not found").
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const code = body.code.trim().toUpperCase()

    const { data: row, error } = await supabase
      .from('promo_codes')
      .select('id, code, type, value, max_uses, uses, expires_at, active')
      .eq('brand', body.brand)
      .ilike('code', code)
      .maybeSingle()

    if (error) {
      console.error('[redeem-promo] db error:', error)
      return jsonResponse({ ok: false, error: 'lookup failed' }, 500)
    }
    if (!row) return jsonResponse({ ok: false, error: 'Code not found' }, 200)
    if (!row.active) return jsonResponse({ ok: false, error: 'Code is inactive' }, 200)
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return jsonResponse({ ok: false, error: 'Code has expired' }, 200)
    }
    if (row.max_uses !== null && row.uses >= row.max_uses) {
      return jsonResponse({ ok: false, error: 'Code usage limit reached' }, 200)
    }

    // Compute discount in pence against the provided subtotal.
    let discount_pence = 0
    if (row.type === 'percent') {
      discount_pence = Math.min(body.subtotal_pence, Math.round((body.subtotal_pence * Number(row.value)) / 100))
    } else if (row.type === 'fixed') {
      // `value` is stored in pounds (numeric(10,2)). Convert to pence.
      discount_pence = Math.min(body.subtotal_pence, Math.round(Number(row.value) * 100))
    } else if (row.type === 'free_shipping') {
      // Shipping handled separately at checkout — return 0 here but still
      // issue a token so create-payment / webhook know shipping is free.
      discount_pence = 0
    }

    const now = Date.now()
    const token = await signRedemptionToken({
      brand: body.brand,
      code: row.code,
      type: row.type,
      discount_pence,
      subtotal_pence: body.subtotal_pence,
      promo_id: row.id,
      iat: now,
      exp: now + TOKEN_TTL_MS,
    })

    return jsonResponse({
      ok: true,
      discount_pence,
      type: row.type,
      code: row.code,
      token,
      expires_in_ms: TOKEN_TTL_MS,
    })
  } catch (err) {
    console.error('[redeem-promo] uncaught:', err)
    return jsonResponse({ ok: false, error: 'internal error' }, 500)
  }
})
