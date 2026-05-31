import { BRAND_LABELS, type Brand } from '../../lib/config/brand'
import { useAdminBrand } from '../context/AdminBrandContext'

const BRANDS: Brand[] = ['vitalabs', 'peptiva']

export function BrandSwitcher() {
  const { brand, setBrand } = useAdminBrand()
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--color-admin-muted)]">
      <span className="hidden sm:inline">Brand</span>
      <select
        value={brand}
        onChange={e => setBrand(e.target.value as Brand)}
        className="h-8 rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface-elevated)] px-2 text-sm font-medium text-[var(--color-admin-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-primary)]"
      >
        {BRANDS.map(b => <option key={b} value={b}>{BRAND_LABELS[b]}</option>)}
      </select>
    </label>
  )
}
