import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useAdminBrand } from '../context/AdminBrandContext'
import { BRAND_LABELS } from '../../lib/config/brand'
import { supabase } from '../../lib/supabase'

interface Counters {
  ordersToday: number
  ordersWeek: number
  revenueWeek: number
  leadsWeek: number
  activeProducts: number
  activePromoCodes: number
}

const EMPTY: Counters = {
  ordersToday: 0, ordersWeek: 0, revenueWeek: 0, leadsWeek: 0, activeProducts: 0, activePromoCodes: 0,
}

function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function weekStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

async function loadCounters(brand: 'vitalabs' | 'peptiva'): Promise<Counters> {
  const since = weekStart()
  const today = todayStart()

  const [ordersToday, ordersWeek, leadsWeek, productsActive, promoActive] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('brand', brand).gte('created_at', today),
    supabase.from('orders').select('total, status').eq('brand', brand).gte('created_at', since),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('brand', brand).gte('created_at', since),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('brand', brand).eq('status', 'active'),
    supabase.from('promo_codes').select('id', { count: 'exact', head: true }).eq('brand', brand).eq('active', true),
  ])

  const ordersWeekRows = (ordersWeek.data ?? []) as Array<{ total: number; status: string }>
  const revenueWeek = ordersWeekRows
    .filter(o => o.status === 'paid' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + Number(o.total), 0)

  return {
    ordersToday: ordersToday.count ?? 0,
    ordersWeek: ordersWeekRows.length,
    revenueWeek,
    leadsWeek: leadsWeek.count ?? 0,
    activeProducts: productsActive.count ?? 0,
    activePromoCodes: promoActive.count ?? 0,
  }
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-admin-border)] bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--color-admin-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--color-admin-text)]">{value}</div>
      {sub ? <div className="mt-1 text-xs text-[var(--color-admin-muted)]">{sub}</div> : null}
    </div>
  )
}

export default function DashboardPage() {
  const { brand } = useAdminBrand()
  const [counters, setCounters] = useState<Counters>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadCounters(brand)
      .then(c => { if (!cancelled) setCounters(c) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load counters') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [brand])

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Managing ${BRAND_LABELS[brand]}. Use the navigation on the left to edit site config, content, operations, and marketing.`}
      />

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-admin-danger)]">{error}</div> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Orders today" value={loading ? '…' : counters.ordersToday} />
        <Stat label="Orders this week" value={loading ? '…' : counters.ordersWeek} />
        <Stat label="Revenue this week" value={loading ? '…' : `£${counters.revenueWeek.toFixed(2)}`} sub="paid + fulfilled" />
        <Stat label="Leads this week" value={loading ? '…' : counters.leadsWeek} />
        <Stat label="Active products" value={loading ? '…' : counters.activeProducts} />
        <Stat label="Active promo codes" value={loading ? '…' : counters.activePromoCodes} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Site config" description="Pixels, brand, WhatsApp, SEO" />
          <CardBody className="flex flex-col gap-2 text-sm">
            <Link to="/admin/site-config/tracking" className="text-[var(--color-admin-primary)] hover:underline">Edit tracking pixels →</Link>
            <Link to="/admin/site-config/brand" className="text-[var(--color-admin-primary)] hover:underline">Brand info →</Link>
            <Link to="/admin/site-config/whatsapp" className="text-[var(--color-admin-primary)] hover:underline">WhatsApp widget →</Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Catalogue" description="Products, reviews, FAQs" />
          <CardBody className="flex flex-col gap-2 text-sm">
            <Link to="/admin/content/products" className="text-[var(--color-admin-primary)] hover:underline">Products →</Link>
            <Link to="/admin/content/reviews" className="text-[var(--color-admin-primary)] hover:underline">Reviews →</Link>
            <Link to="/admin/content/legal" className="text-[var(--color-admin-primary)] hover:underline">Legal pages →</Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Operations" description="Orders, leads, support" />
          <CardBody className="flex flex-col gap-2 text-sm">
            <Link to="/admin/ops/orders" className="text-[var(--color-admin-primary)] hover:underline">Orders →</Link>
            <Link to="/admin/ops/leads" className="text-[var(--color-admin-primary)] hover:underline">Leads (CSV export) →</Link>
            <Link to="/admin/ops/support" className="text-[var(--color-admin-primary)] hover:underline">Support inbox →</Link>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
