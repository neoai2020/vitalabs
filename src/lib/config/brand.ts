/**
 * Brand resolution. Both vitalabs and peptiva ship the same code base;
 * each deployment sets VITE_BRAND in its env to select which brand it
 * serves. All Supabase queries against brand-scoped tables filter by
 * this value so the two brands share one database without cross-talk.
 */

export type Brand = 'vitalabs' | 'peptiva'

const VALID_BRANDS: Brand[] = ['vitalabs', 'peptiva']

function isBrand(value: string): value is Brand {
  return (VALID_BRANDS as string[]).includes(value)
}

export function getBrand(): Brand {
  const fromEnv = import.meta.env.VITE_BRAND
  if (typeof fromEnv === 'string') {
    // Be lenient about casing — VITE_BRAND=Peptiva should still resolve.
    const normalized = fromEnv.trim().toLowerCase()
    if (isBrand(normalized)) return normalized
  }
  return 'vitalabs'
}

export const BRAND_LABELS: Record<Brand, string> = {
  vitalabs: 'Vita Labs',
  peptiva: 'Peptiva',
}

/** Per-brand logo asset. Each brand ships its own wordmark; both files
 *  live in /public/images/. */
export const BRAND_LOGOS: Record<Brand, string> = {
  vitalabs: '/images/logo.svg',
  peptiva: '/images/logo-peptiva.png',
}

/** Convenience: the logo for the currently-resolved brand. */
export function getBrandLogo(): string {
  return BRAND_LOGOS[getBrand()]
}
