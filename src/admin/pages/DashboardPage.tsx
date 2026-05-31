import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useAdminBrand } from '../context/AdminBrandContext'
import { BRAND_LABELS, type Brand } from '../../lib/config/brand'
import { supabase } from '../../lib/supabase'
import { KpiCard } from '../components/charts/KpiCard'
import { MiniChart, type ChartPoint } from '../components/charts/MiniChart'

type Range = '7d' | '30d'

interface AnalyticsEventRow {
  session_id: string
  event_name: string
  created_at: string
}

interface OrderRow {
  status: string
  total: number
  created_at: string
}

interface Bucket {
  visitors: number
  checkouts: number
  conversions: number
}

interface Series {
  visitors: ChartPoint[]
  checkouts: ChartPoint[]
  conversions: ChartPoint[]
  abandonment: ChartPoint[]
}

interface Totals {
  visitors: number
  checkouts: number
  conversions: number
  abandonmentPct: number
  conversionPct: number
  revenue: number
}

function rangeDays(range: Range): number {
  return range === '7d' ? 7 : 30
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildEmptyBuckets(days: number): Map<string, Bucket> {
  const out = new Map<string, Bucket>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    out.set(dayKey(d), { visitors: 0, checkouts: 0, conversions: 0 })
  }
  return out
}

interface LoadResult {
  series: Series
  totals: Totals
  deltas: { visitors: number | null; checkouts: number | null; conversion: number | null; abandonment: number | null }
}

async function loadAnalytics(brand: Brand, range: Range): Promise<LoadResult> {
  const days = rangeDays(range)
  // Pull twice the window so we can compare current period to previous.
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (days * 2 - 1))

  const [eventsRes, ordersRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('session_id, event_name, created_at')
      .eq('brand', brand)
      .gte('created_at', since.toISOString())
      .in('event_name', ['page_view', 'checkout_started', 'checkout_completed'])
      .limit(50_000),
    supabase
      .from('orders')
      .select('status, total, created_at')
      .eq('brand', brand)
      .gte('created_at', since.toISOString()),
  ])

  if (eventsRes.error) throw eventsRes.error
  if (ordersRes.error) throw ordersRes.error

  const events = (eventsRes.data ?? []) as AnalyticsEventRow[]
  const orders = (ordersRes.data ?? []) as OrderRow[]

  // Bucket per day. A "visitor" is a distinct session_id that fired any
  // page_view that day. "checkouts" = distinct sessions that fired
  // checkout_started. Conversions come from the orders table directly
  // (paid + fulfilled), as that's the source of truth even when CAPI
  // pixel events go missing.
  const seenForDay: Record<string, { vis: Set<string>; ck: Set<string> }> = {}

  for (const e of events) {
    const d = new Date(e.created_at)
    const key = dayKey(d)
    const bucket = (seenForDay[key] ||= { vis: new Set(), ck: new Set() })
    if (e.event_name === 'page_view') bucket.vis.add(e.session_id)
    else if (e.event_name === 'checkout_started') bucket.ck.add(e.session_id)
  }

  const buckets = buildEmptyBuckets(days * 2)

  for (const [key, bucket] of Object.entries(seenForDay)) {
    if (!buckets.has(key)) continue
    const b = buckets.get(key)!
    b.visitors = bucket.vis.size
    b.checkouts = bucket.ck.size
  }

  for (const o of orders) {
    if (o.status !== 'paid' && o.status !== 'fulfilled') continue
    const key = dayKey(new Date(o.created_at))
    const b = buckets.get(key)
    if (b) b.conversions += 1
  }

  const ordered = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b))
  const recent = ordered.slice(-days)
  const previous = ordered.slice(0, days)

  const series: Series = {
    visitors: recent.map(([label, v]) => ({ label, value: v.visitors })),
    checkouts: recent.map(([label, v]) => ({ label, value: v.checkouts })),
    conversions: recent.map(([label, v]) => ({ label, value: v.conversions })),
    abandonment: recent.map(([label, v]) => ({
      label,
      value: v.checkouts > 0 ? Math.round(((v.checkouts - v.conversions) / v.checkouts) * 100) : 0,
    })),
  }

  const sumRecent = recent.reduce(
    (acc, [, v]) => {
      acc.vis += v.visitors
      acc.ck += v.checkouts
      acc.cv += v.conversions
      return acc
    },
    { vis: 0, ck: 0, cv: 0 },
  )
  const sumPrev = previous.reduce(
    (acc, [, v]) => {
      acc.vis += v.visitors
      acc.ck += v.checkouts
      acc.cv += v.conversions
      return acc
    },
    { vis: 0, ck: 0, cv: 0 },
  )

  const revenue = orders
    .filter(o => (o.status === 'paid' || o.status === 'fulfilled') && new Date(o.created_at) >= new Date(recent[0][0]))
    .reduce((sum, o) => sum + Number(o.total), 0)

  const conversionPct = sumRecent.vis > 0 ? (sumRecent.cv / sumRecent.vis) * 100 : 0
  const abandonmentPct = sumRecent.ck > 0 ? ((sumRecent.ck - sumRecent.cv) / sumRecent.ck) * 100 : 0
  const prevConversionPct = sumPrev.vis > 0 ? (sumPrev.cv / sumPrev.vis) * 100 : 0
  const prevAbandonmentPct = sumPrev.ck > 0 ? ((sumPrev.ck - sumPrev.cv) / sumPrev.ck) * 100 : 0

  const pctChange = (cur: number, prev: number): number | null => {
    if (prev === 0) return cur === 0 ? 0 : null
    return ((cur - prev) / prev) * 100
  }

  return {
    series,
    totals: {
      visitors: sumRecent.vis,
      checkouts: sumRecent.ck,
      conversions: sumRecent.cv,
      conversionPct,
      abandonmentPct,
      revenue,
    },
    deltas: {
      visitors: pctChange(sumRecent.vis, sumPrev.vis),
      checkouts: pctChange(sumRecent.ck, sumPrev.ck),
      conversion: pctChange(conversionPct, prevConversionPct),
      abandonment: pctChange(abandonmentPct, prevAbandonmentPct),
    },
  }
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const opts: Range[] = ['7d', '30d']
  return (
    <div className="flex items-center gap-1">
      {opts.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`admin-tab font-mono uppercase ${value === opt ? 'admin-tab--active' : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { brand } = useAdminBrand()
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<LoadResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadAnalytics(brand, range)
      .then(r => { if (!cancelled) setData(r) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [brand, range])

  const totals = data?.totals
  const series = data?.series
  const deltas = data?.deltas

  const periodLabel = range === '7d' ? 'last 7 days' : 'last 30 days'

  const conversionRateData = useMemo<ChartPoint[]>(() => {
    if (!series) return []
    return series.visitors.map((p, i) => {
      const visitors = p.value
      const conversions = series.conversions[i]?.value ?? 0
      return {
        label: p.label,
        value: visitors > 0 ? Math.round((conversions / visitors) * 1000) / 10 : 0,
      }
    })
  }, [series])

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Real-time funnel for ${BRAND_LABELS[brand]} — visitors, checkout intent, conversion rate, abandonment.`}
        actions={<RangeToggle value={range} onChange={setRange} />}
      />

      {error ? (
        <div className="mb-4 rounded-md border border-[var(--color-admin-danger)]/30 bg-[var(--color-admin-danger-soft)] px-4 py-3 text-sm text-[var(--color-admin-danger)]">
          {error}
        </div>
      ) : null}

      {/* KPI ROW */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total visitors"
          value={loading ? '…' : String(totals?.visitors ?? 0)}
          hint={periodLabel}
          deltaPct={deltas?.visitors ?? null}
          data={series?.visitors ?? []}
          variant="primary"
          loading={loading}
        />
        <KpiCard
          label="Reached checkout"
          value={loading ? '…' : String(totals?.checkouts ?? 0)}
          hint={periodLabel}
          deltaPct={deltas?.checkouts ?? null}
          data={series?.checkouts ?? []}
          variant="success"
          loading={loading}
        />
        <KpiCard
          label="Conversion rate"
          value={loading ? '…' : `${(totals?.conversionPct ?? 0).toFixed(2)}%`}
          hint={`${totals?.conversions ?? 0} paid / ${totals?.visitors ?? 0} visitors`}
          deltaPct={deltas?.conversion ?? null}
          data={conversionRateData}
          variant="warning"
          loading={loading}
        />
        <KpiCard
          label="Cart abandonment"
          value={loading ? '…' : `${(totals?.abandonmentPct ?? 0).toFixed(1)}%`}
          hint={`${(totals?.checkouts ?? 0) - (totals?.conversions ?? 0)} abandoned of ${totals?.checkouts ?? 0}`}
          deltaPct={deltas?.abandonment ?? null}
          goodWhenDown
          data={series?.abandonment ?? []}
          variant="danger"
          loading={loading}
        />
      </div>

      {/* SECONDARY: large chart + funnel */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Visitors vs checkouts"
            description="Daily uniques. Wide gap below the visitor line = friction in the funnel."
          />
          <CardBody>
            <div className="mb-3 flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-2 text-[var(--color-admin-muted)]">
                <span className="inline-block h-2 w-3 rounded-sm bg-gradient-to-r from-[#22d3ee] to-[#a78bfa]" />
                Visitors
              </span>
              <span className="inline-flex items-center gap-2 text-[var(--color-admin-muted)]">
                <span className="inline-block h-2 w-3 rounded-sm bg-gradient-to-r from-[#34d399] to-[#22d3ee]" />
                Reached checkout
              </span>
            </div>
            <OverlayChart
              primary={series?.visitors ?? []}
              secondary={series?.checkouts ?? []}
              height={200}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Funnel snapshot" description={periodLabel} />
          <CardBody>
            <FunnelStep
              label="Visitors"
              value={totals?.visitors ?? 0}
              barPct={100}
              colorFrom="#22d3ee"
              colorTo="#22d3ee"
            />
            <FunnelStep
              label="Reached checkout"
              value={totals?.checkouts ?? 0}
              barPct={totals && totals.visitors > 0 ? (totals.checkouts / totals.visitors) * 100 : 0}
              colorFrom="#22d3ee"
              colorTo="#34d399"
            />
            <FunnelStep
              label="Completed purchase"
              value={totals?.conversions ?? 0}
              barPct={totals && totals.visitors > 0 ? (totals.conversions / totals.visitors) * 100 : 0}
              colorFrom="#a78bfa"
              colorTo="#6366f1"
            />
            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-admin-border)] pt-3 text-xs">
              <span className="text-[var(--color-admin-muted)]">Revenue ({periodLabel})</span>
              <span className="admin-kpi-value text-base font-semibold">
                £{(totals?.revenue ?? 0).toFixed(2)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* QUICK LINKS */}
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

function OverlayChart({
  primary,
  secondary,
  height,
}: {
  primary: ChartPoint[]
  secondary: ChartPoint[]
  height: number
}) {
  // Both series share the same Y scale so a checkout count never appears
  // above the visitor count from the same day (which would be misleading).
  const sharedMax = useMemo(() => {
    const all = [...primary, ...secondary].map(p => p.value)
    return Math.max(...all, 1)
  }, [primary, secondary])

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0">
        <MiniChart
          data={primary}
          height={height}
          showAxis
          variant="primary"
          showDot={false}
          yMax={sharedMax}
        />
      </div>
      <div className="absolute inset-0">
        <MiniChart
          data={secondary}
          height={height}
          showAxis={false}
          variant="success"
          showDot
          yMax={sharedMax}
        />
      </div>
    </div>
  )
}

function FunnelStep({
  label,
  value,
  barPct,
  colorFrom,
  colorTo,
}: {
  label: string
  value: number
  barPct: number
  colorFrom: string
  colorTo: string
}) {
  const safe = Math.max(0, Math.min(100, barPct))
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--color-admin-muted)]">{label}</span>
        <span className="admin-kpi-value font-semibold text-[var(--color-admin-text-strong)]">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-admin-bg-soft)] ring-1 ring-inset ring-[var(--color-admin-border)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${safe}%`,
            background: `linear-gradient(90deg, ${colorFrom} 0%, ${colorTo} 100%)`,
            boxShadow: `0 0 8px ${colorFrom}55`,
          }}
        />
      </div>
      <div className="mt-1 text-right font-mono text-[10px] text-[var(--color-admin-subtle)]">
        {safe.toFixed(1)}%
      </div>
    </div>
  )
}
