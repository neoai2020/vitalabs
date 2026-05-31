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

export interface ValidatePromoResult {
  ok: boolean
  promo?: PromoCode
  error?: string
}

/**
 * Validates a promo code for the current brand. Pure client-side check
 * (active + not expired + usage cap not reached). Uses count is not
 * incremented here — actual redemption needs to happen server-side
 * after payment confirms.
 */
export async function validatePromoCode(rawCode: string): Promise<ValidatePromoResult> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Enter a code' }

  const { data, error } = await supabase
    .from('promo_codes')
    .select('id, code, type, value, max_uses, uses, expires_at, active, description')
    .eq('brand', getBrand())
    .ilike('code', code)
    .maybeSingle()
  if (error) return { ok: false, error: 'Could not validate code' }
  if (!data) return { ok: false, error: 'Code not found' }
  if (!data.active) return { ok: false, error: 'Code is inactive' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, error: 'Code has expired' }
  }
  if (data.max_uses !== null && data.uses >= data.max_uses) {
    return { ok: false, error: 'Code usage limit reached' }
  }
  return { ok: true, promo: data as PromoCode }
}

/**
 * Computes the absolute discount in pounds for a given promo + subtotal.
 * Returns 0 for invalid combinations.
 */
export function discountFor(promo: PromoCode | null | undefined, subtotal: number): number {
  if (!promo || subtotal <= 0) return 0
  if (promo.type === 'percent') return Math.min(subtotal, (subtotal * promo.value) / 100)
  if (promo.type === 'fixed') return Math.min(subtotal, promo.value)
  return 0
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
