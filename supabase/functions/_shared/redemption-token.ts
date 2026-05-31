/**
 * HMAC-signed redemption tokens used to thread server-verified promo
 * discounts through the checkout flow without trusting the client.
 *
 * The token format is `<base64url(payload)>.<base64url(signature)>` where
 * the signature is HMAC-SHA256(payload, REDEMPTION_SECRET). Tokens are
 * short-lived (default 30 minutes) — long enough for a checkout but
 * short enough that a leaked token expires quickly.
 *
 * Signing key MUST be set as a Supabase secret named PROMO_SIGNING_SECRET.
 */

export interface RedemptionPayload {
  /** Brand the promo applies to (vitalabs | peptiva). */
  brand: string
  /** Promo code in upper-case. */
  code: string
  /** Promo type at time of signing. */
  type: 'percent' | 'fixed' | 'free_shipping'
  /** Absolute discount in pence (calculated server-side against subtotal). */
  discount_pence: number
  /** Subtotal in pence the discount was calculated against. */
  subtotal_pence: number
  /** Promo row id, used to increment uses after payment confirms. */
  promo_id: string
  /** Unix epoch milliseconds when the token was issued. */
  iat: number
  /** Unix epoch milliseconds when the token expires. */
  exp: number
}

function getSecret(): string {
  const secret = Deno.env.get('PROMO_SIGNING_SECRET')
  if (!secret) throw new Error('PROMO_SIGNING_SECRET not configured')
  return secret
}

function b64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmac(payloadBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, payloadBytes)
  return new Uint8Array(sig)
}

export async function signRedemptionToken(payload: RedemptionPayload): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const sigBytes = await hmac(payloadBytes)
  return `${b64UrlEncode(payloadBytes)}.${b64UrlEncode(sigBytes)}`
}

export async function verifyRedemptionToken(token: string): Promise<RedemptionPayload | null> {
  const [payloadB64, sigB64] = token.split('.')
  if (!payloadB64 || !sigB64) return null
  let payloadBytes: Uint8Array
  let providedSig: Uint8Array
  try {
    payloadBytes = b64UrlDecode(payloadB64)
    providedSig = b64UrlDecode(sigB64)
  } catch {
    return null
  }
  const expectedSig = await hmac(payloadBytes)
  if (expectedSig.length !== providedSig.length) return null
  // Constant-time compare to defeat timing oracles.
  let diff = 0
  for (let i = 0; i < expectedSig.length; i++) diff |= expectedSig[i] ^ providedSig[i]
  if (diff !== 0) return null

  let payload: RedemptionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    return null
  }
  if (Date.now() > payload.exp) return null
  return payload
}
