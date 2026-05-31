import { supabase } from './supabase'
import { getBrand } from './config/brand'

export type PromoType = 'percent' | 'fixed' | 'free_shipping'

export interface PromoCode {
  id: string
  code: string
  type: PromoType
  value: number
  max_uses: number | null
  uses: number
  expires_at: string | null
  active: boolean
  description: string | null
}

export interface RedemptionResult {
  ok: boolean
  /** Discount in pounds (pence converted) — display only. */
  discount?: number
  /** Server-issued HMAC token to pass to create-payment for verification. */
  token?: string
  /** Server-canonical code (upper-cased). */
  code?: string
  type?: PromoType
  error?: string
}

/**
 * Calls the `redeem-promo` Edge Function to validate a code server-side
 * and obtain a short-lived signed token. The token is then handed to
 * `createPaymentIntent` so the server can re-verify the discount before
 * charging — guarantees the discount the user sees is the discount the
 * server will honour, and prevents devtools tampering with the amount.
 *
 * `subtotalPounds` is the pre-discount cart subtotal in pounds.
 */
export async function redeemPromoCode(
  rawCode: string,
  subtotalPounds: number,
): Promise<RedemptionResult> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Enter a code' }
  if (!subtotalPounds || subtotalPounds <= 0) return { ok: false, error: 'Empty cart' }

  const { data, error } = await supabase.functions.invoke('redeem-promo', {
    body: {
      brand: getBrand(),
      code,
      subtotal_pence: Math.round(subtotalPounds * 100),
    },
  })

  if (error) return { ok: false, error: error.message || 'Could not validate code' }
  if (!data?.ok) return { ok: false, error: data?.error || 'Invalid code' }
  return {
    ok: true,
    discount: (data.discount_pence ?? 0) / 100,
    token: data.token,
    code: data.code,
    type: data.type,
  }
}

export interface UpsellOffer {
  id: string
  product_id: string
  discount_pct: number
  timer_seconds: number
  headline: string | null
  subheadline: string | null
  cta: string | null
  active: boolean
  sort_order: number
}

export async function fetchActiveUpsellOffer(): Promise<UpsellOffer | null> {
  const { data, error } = await supabase
    .from('upsell_offers')
    .select('*')
    .eq('brand', getBrand())
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as UpsellOffer
}

export interface Banner {
  id: string
  message: string
  link: string | null
  background_color: string
  text_color: string
  start_at: string | null
  end_at: string | null
  active: boolean
}

export async function fetchActiveBanner(): Promise<Banner | null> {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('banners')
    .select('*')
    .eq('brand', getBrand())
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(20)
  if (!data) return null
  const candidates = (data as Banner[]).filter(b =>
    (!b.start_at || b.start_at <= now) && (!b.end_at || b.end_at >= now)
  )
  return candidates[0] ?? null
}
