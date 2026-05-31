/**
 * Server-side Facebook Conversions API (CAPI) event forwarder.
 *
 * Why: iOS Safari, ad-blockers, and ITP increasingly block the browser
 * Meta Pixel. Sending the SAME event server-side (deduplicated via
 * `event_id`) recovers ~10–30% of conversions and improves Ads
 * Manager's optimisation signal.
 *
 * Body:
 *   {
 *     brand: 'vitalabs' | 'peptiva',
 *     event_name: 'PageView' | 'Lead' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | string,
 *     event_id: string,           // dedupe key — same id used by browser pixel
 *     event_source_url: string,   // page URL
 *     user_data?: {
 *       email?: string,
 *       phone?: string,
 *       first_name?: string,
 *       last_name?: string,
 *       country?: string,
 *       client_ip?: string,
 *       client_user_agent?: string,
 *       fbp?: string,             // _fbp cookie
 *       fbc?: string,             // _fbc cookie
 *     },
 *     custom_data?: Record<string, unknown>,
 *   }
 *
 * Secrets used (per-brand):
 *   FB_PIXEL_ID_VITALABS, FB_CAPI_TOKEN_VITALABS
 *   FB_PIXEL_ID_PEPTIVA,  FB_CAPI_TOKEN_PEPTIVA
 *   FB_TEST_EVENT_CODE  (optional — for staging tests, leave unset in prod)
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'

interface UserData {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  country?: string
  client_ip?: string
  client_user_agent?: string
  fbp?: string
  fbc?: string
}

interface RequestBody {
  brand: 'vitalabs' | 'peptiva'
  event_name: string
  event_id: string
  event_source_url: string
  user_data?: UserData
  custom_data?: Record<string, unknown>
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashUserData(u: UserData, fallbackIp: string, fallbackUa: string): Promise<Record<string, string | string[]>> {
  const out: Record<string, string | string[]> = {}
  if (u.email) out.em = [await sha256(u.email)]
  if (u.phone) out.ph = [await sha256(u.phone.replace(/[^0-9]/g, ''))]
  if (u.first_name) out.fn = [await sha256(u.first_name)]
  if (u.last_name) out.ln = [await sha256(u.last_name)]
  if (u.country) out.country = [await sha256(u.country)]
  if (u.fbp) out.fbp = u.fbp
  if (u.fbc) out.fbc = u.fbc
  const ip = u.client_ip || fallbackIp
  if (ip) out.client_ip_address = ip
  const ua = u.client_user_agent || fallbackUa
  if (ua) out.client_user_agent = ua
  return out
}

function brandSecrets(brand: string): { pixelId: string | undefined; token: string | undefined } {
  if (brand === 'vitalabs') {
    return {
      pixelId: Deno.env.get('FB_PIXEL_ID_VITALABS'),
      token: Deno.env.get('FB_CAPI_TOKEN_VITALABS'),
    }
  }
  if (brand === 'peptiva') {
    return {
      pixelId: Deno.env.get('FB_PIXEL_ID_PEPTIVA'),
      token: Deno.env.get('FB_CAPI_TOKEN_PEPTIVA'),
    }
  }
  return { pixelId: undefined, token: undefined }
}

serve(async (req: Request) => {
  const pre = handleOptions(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = (await req.json()) as RequestBody
    if (!body.brand || !body.event_name || !body.event_id) {
      return jsonResponse({ error: 'brand, event_name and event_id are required' }, 400)
    }

    const { pixelId, token } = brandSecrets(body.brand)
    if (!pixelId || !token) {
      // Not configured for this brand — return 200 so the client doesn't
      // see CAPI as a hard dependency. The browser pixel still fires.
      console.log(`[fb-capi-event] no CAPI creds for brand=${body.brand}, skipping`)
      return jsonResponse({ ok: true, skipped: true })
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const clientUa = req.headers.get('user-agent') ?? ''
    const userData = await hashUserData(body.user_data ?? {}, clientIp, clientUa)

    const event = {
      event_name: body.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      action_source: 'website',
      user_data: userData,
      custom_data: body.custom_data ?? {},
    }

    const payload: Record<string, unknown> = { data: [event] }
    const testCode = Deno.env.get('FB_TEST_EVENT_CODE')
    if (testCode) payload.test_event_code = testCode

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`
    const fbRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const fbBody = await fbRes.json()

    if (!fbRes.ok) {
      console.error('[fb-capi-event] FB error:', fbBody)
      return jsonResponse({ ok: false, fb: fbBody }, fbRes.status)
    }

    return jsonResponse({ ok: true, fb: fbBody })
  } catch (err) {
    console.error('[fb-capi-event] uncaught:', err)
    return jsonResponse({ error: 'internal error' }, 500)
  }
})
