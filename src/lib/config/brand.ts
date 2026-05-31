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
  if (typeof fromEnv === 'string' && isBrand(fromEnv)) return fromEnv
  return 'vitalabs'
}

export const BRAND_LABELS: Record<Brand, string> = {
  vitalabs: 'Vita Labs',
  peptiva: 'Peptiva',
}
