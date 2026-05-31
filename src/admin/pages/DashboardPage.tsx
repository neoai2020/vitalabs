import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useAdminBrand } from '../context/AdminBrandContext'
import type { Brand } from '../../lib/config/brand'
import { supabase } from '../../lib/supabase'
import { KpiCard } from '../components/charts/KpiCard'
import { LineChart } from '../components/charts/LineChart'
import type { ChartPoint } from '../components/charts/MiniChart'

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
    <div className="inline-flex items-center gap-0.5 rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] p-0.5">
      {opts.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`admin-mono rounded px-2.5 py-1 text-[11.5px] uppercase transition-colors ${
            value === opt
              ? 'bg-[var(--color-admin-text-strong)] text-white'
              : 'text-[var(--color-admin-muted)] hover:text-[var(--color-admin-text-strong)]'
          }`}
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
        description="Visitors, checkout intent, conversion rate, and abandonment — at a glance."
        actions={<RangeToggle value={range} onChange={setRange} />}
      />

      {error ? (
        <div className="mb-4 rounded-md border border-[var(--color-admin-danger)]/30 bg-[var(--color-admin-danger-soft)] px-4 py-3 text-[13px] text-[var(--color-admin-danger)]">
          {error}
        </div>
      ) : null}

      {/* KPI ROW */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Total visitors"
          value={loading ? '—' : String(totals?.visitors ?? 0)}
          hint={periodLabel}
          deltaPct={deltas?.visitors ?? null}
          data={series?.visitors ?? []}
          variant="primary"
          loading={loading}
        />
        <KpiCard
          index={1}
          label="Reached checkout"
          value={loading ? '—' : String(totals?.checkouts ?? 0)}
          hint={periodLabel}
          deltaPct={deltas?.checkouts ?? null}
          data={series?.checkouts ?? []}
          variant="success"
          loading={loading}
        />
        <KpiCard
          index={2}
          label="Conversion rate"
          value={loading ? '—' : `${(totals?.conversionPct ?? 0).toFixed(2)}%`}
          hint={`${totals?.conversions ?? 0} paid · ${totals?.visitors ?? 0} visitors`}
          deltaPct={deltas?.conversion ?? null}
          data={conversionRateData}
          variant="warning"
          loading={loading}
          formatBreakdown={n => `${n.toFixed(1)}%`}
        />
        <KpiCard
          index={3}
          label="Cart abandonment"
          value={loading ? '—' : `${(totals?.abandonmentPct ?? 0).toFixed(1)}%`}
          hint={`${(totals?.checkouts ?? 0) - (totals?.conversions ?? 0)} abandoned of ${totals?.checkouts ?? 0}`}
          deltaPct={deltas?.abandonment ?? null}
          goodWhenDown
          data={series?.abandonment ?? []}
          variant="danger"
          loading={loading}
          formatBreakdown={n => `${n.toFixed(0)}%`}
        />
      </div>

      {/* SECONDARY: large chart + funnel */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Visitors vs checkouts"
            description="Daily uniques. Hover the chart for exact numbers per day."
          />
          <CardBody className="pt-6">
            <LineChart
              height={280}
              series={[
                {
                  id: 'visitors',
                  label: 'Visitors',
                  variant: 'primary',
                  fill: true,
                  data: series?.visitors ?? [],
                },
                {
                  id: 'checkouts',
                  label: 'Reached checkout',
                  variant: 'success',
                  fill: false,
                  data: series?.checkouts ?? [],
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Conversion funnel" description={periodLabel} />
          <CardBody className="pt-2">
            <FunnelTable totals={totals} loading={loading} />
            <div className="mt-5 flex items-baseline justify-between border-t border-[var(--color-admin-border)] pt-4">
              <span className="text-[11.5px] uppercase tracking-[0.1em] text-[var(--color-admin-muted)]">Revenue</span>
              <span className="admin-mono text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-admin-text-strong)]">
                £{(totals?.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* SHORTCUTS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ShortcutCard
          title="Site config"
          description="Pixels, brand, WhatsApp, SEO"
          links={[
            { to: '/admin/site-config/tracking', label: 'Tracking pixels' },
            { to: '/admin/site-config/brand', label: 'Brand info' },
            { to: '/admin/site-config/whatsapp', label: 'WhatsApp widget' },
          ]}
        />
        <ShortcutCard
          title="Catalogue"
          description="Products, reviews, FAQs"
          links={[
            { to: '/admin/content/products', label: 'Products' },
            { to: '/admin/content/reviews', label: 'Reviews' },
            { to: '/admin/content/legal', label: 'Legal pages' },
          ]}
        />
        <ShortcutCard
          title="Operations"
          description="Orders, leads, support"
          links={[
            { to: '/admin/ops/orders', label: 'Orders' },
            { to: '/admin/ops/leads', label: 'Leads · CSV export' },
            { to: '/admin/ops/support', label: 'Support inbox' },
          ]}
        />
      </div>
    </>
  )
}

function ShortcutCard({
  title,
  description,
  links,
}: {
  title: string
  description: string
  links: { to: string; label: string }[]
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="flex flex-col">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="group -mx-1 flex items-center justify-between rounded-md px-1 py-1.5 text-[13.5px] text-[var(--color-admin-text)] transition-colors hover:text-[var(--color-admin-text-strong)]"
          >
            <span>{link.label}</span>
            <span className="text-[var(--color-admin-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-admin-text-strong)]">
              →
            </span>
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}

/**
 * Tabular funnel — replaces the bouncy-bar version with a structural,
 * monospace breakdown. Each row carries:
 *   - a label and the absolute count (right-aligned monospace)
 *   - a hairline progress meter sized to the % of the top of funnel
 *   - the drop-off vs the *previous* step (e.g. "−71.2% from Visitors")
 * Reads like a real analytics breakdown, not a chart-junk infographic.
 */
function FunnelTable({
  totals,
  loading,
}: {
  totals: Totals | undefined
  loading: boolean
}) {
  const rows = useMemo(() => {
    const visitors = totals?.visitors ?? 0
    const checkouts = totals?.checkouts ?? 0
    const conversions = totals?.conversions ?? 0
    return [
      { id: 'visitors',    label: 'Visitors',          value: visitors,    prev: null as number | null, prevLabel: null as string | null },
      { id: 'checkouts',   label: 'Reached checkout',  value: checkouts,   prev: visitors,              prevLabel: 'visitors' },
      { id: 'conversions', label: 'Completed purchase', value: conversions, prev: checkouts,             prevLabel: 'checkouts' },
    ].map(r => {
      const top = visitors > 0 ? Math.min(100, (r.value / visitors) * 100) : 0
      const dropPct = r.prev !== null && r.prev > 0
        ? ((r.prev - r.value) / r.prev) * 100
        : null
      return { ...r, topPct: top, dropPct }
    })
  }, [totals])

  return (
    <div className="flex flex-col">
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={`py-3 ${i === 0 ? '' : 'border-t border-[var(--color-admin-border)]'}`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-[var(--color-admin-text)]">{r.label}</span>
            <span className="admin-mono text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-admin-text-strong)]">
              {loading ? '—' : r.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 relative h-[3px] overflow-hidden rounded-full bg-[var(--color-admin-surface-sunken)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-admin-text-strong)] transition-[width] duration-700 ease-out"
              style={{ width: `${r.topPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--color-admin-subtle)]">
            <span className="admin-mono">
              {r.topPct.toFixed(1)}% of top
            </span>
            {r.dropPct !== null
              ? <span className="admin-mono">
                  −{r.dropPct.toFixed(1)}% vs {r.prevLabel}
                </span>
              : null}
          </div>
        </div>
      ))}
    </div>
  )
}
