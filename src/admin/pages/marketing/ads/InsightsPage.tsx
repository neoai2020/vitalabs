import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../../components/ui/Table'
import { useBrandList } from '../../../hooks/useBrandQuery'
import { useAdminBrand } from '../../../context/AdminBrandContext'
import { supabase } from '../../../../lib/supabase'
import { AdsTabBar } from './AdsTabBar'

interface InsightsRow {
  id: string
  fb_campaign_id: string
  fb_adset_id: string | null
  campaign_id: string | null
  date: string
  spend_pence: number
  impressions: number
  clicks: number
  link_clicks: number
  conversions: number
  conversion_value_pence: number
}

interface CampaignRow {
  id: string
  name: string
  fb_campaign_id: string | null
}

type RangeId = '7d' | '30d'

const RANGES: Record<RangeId, { label: string; days: number }> = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
}

export default function InsightsPage() {
  const { brand } = useAdminBrand()
  const queryClient = useQueryClient()
  const [range, setRange] = useState<RangeId>('7d')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshNote, setRefreshNote] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const { data: campaigns = [] } = useBrandList<CampaignRow>({
    table: 'ad_campaigns',
    orderBy: { column: 'created_at', ascending: false },
  })

  /* We don't use the brand list helper because we need a date filter —
   * react-query handles the cache by key including the range. */
  const { data: insights = [], isLoading } = useQuery<InsightsRow[]>({
    queryKey: ['ad_insights_daily', brand, range],
    queryFn: async () => {
      const since = new Date()
      since.setUTCDate(since.getUTCDate() - RANGES[range].days)
      const { data, error } = await supabase
        .from('ad_insights_daily')
        .select('id, fb_campaign_id, fb_adset_id, campaign_id, date, spend_pence, impressions, clicks, link_clicks, conversions, conversion_value_pence')
        .eq('brand', brand)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as InsightsRow[]
    },
  })

  // Aggregate adset-level rows up to campaign-level totals for the
  // selected range. We surface campaign-level numbers in the table —
  // adset / creative breakdowns are a follow-up.
  const perCampaign = useMemo(() => {
    const byFbId = new Map<string, {
      fb_campaign_id: string
      spend_pence: number
      impressions: number
      clicks: number
      link_clicks: number
      conversions: number
      conversion_value_pence: number
      days: Set<string>
    }>()
    for (const r of insights) {
      const existing = byFbId.get(r.fb_campaign_id) ?? {
        fb_campaign_id: r.fb_campaign_id,
        spend_pence: 0,
        impressions: 0,
        clicks: 0,
        link_clicks: 0,
        conversions: 0,
        conversion_value_pence: 0,
        days: new Set<string>(),
      }
      existing.spend_pence += r.spend_pence
      existing.impressions += r.impressions
      existing.clicks += r.clicks
      existing.link_clicks += r.link_clicks
      existing.conversions += r.conversions
      existing.conversion_value_pence += r.conversion_value_pence
      existing.days.add(r.date)
      byFbId.set(r.fb_campaign_id, existing)
    }
    return Array.from(byFbId.values())
      .map(row => {
        const campaign = campaigns.find(c => c.fb_campaign_id === row.fb_campaign_id)
        const ctr = row.impressions ? (row.clicks / row.impressions) * 100 : 0
        const cpm = row.impressions ? (row.spend_pence / row.impressions) * 1000 / 100 : 0
        const roas = row.spend_pence ? row.conversion_value_pence / row.spend_pence : 0
        return {
          fb_campaign_id: row.fb_campaign_id,
          name: campaign?.name ?? `Unknown · ${row.fb_campaign_id.slice(-6)}`,
          spend_pounds: row.spend_pence / 100,
          impressions: row.impressions,
          clicks: row.clicks,
          link_clicks: row.link_clicks,
          conversions: row.conversions,
          revenue_pounds: row.conversion_value_pence / 100,
          ctr,
          cpm,
          roas,
          days_active: row.days.size,
        }
      })
      .sort((a, b) => b.spend_pounds - a.spend_pounds)
  }, [insights, campaigns])

  const totals = useMemo(() => perCampaign.reduce(
    (acc, c) => ({
      spend: acc.spend + c.spend_pounds,
      revenue: acc.revenue + c.revenue_pounds,
      conversions: acc.conversions + c.conversions,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
    }),
    { spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0 },
  ), [perCampaign])
  const totalRoas = totals.spend ? totals.revenue / totals.spend : 0

  const refresh = async () => {
    setRefreshing(true)
    setRefreshNote(null)
    setRefreshError(null)
    try {
      const since = new Date()
      since.setUTCDate(since.getUTCDate() - RANGES[range].days)
      const { data, error } = await supabase.functions.invoke('pull-fb-insights', {
        body: { brand, since: since.toISOString().slice(0, 10) },
      })
      if (error) throw new Error(error.message)
      const res = data as { ok?: boolean; rows_upserted?: number; error?: string }
      if (!res?.ok) throw new Error(res?.error ?? 'Pull failed')
      setRefreshNote(`Pulled ${res.rows_upserted ?? 0} day-row${res.rows_upserted === 1 ? '' : 's'} from Meta.`)
      queryClient.invalidateQueries({ queryKey: ['ad_insights_daily', brand] })
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Pull failed')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Ad Studio"
        description="Spend, impressions, clicks, conversions, and ROAS per campaign. Pull on demand; Meta's reporting timezone applies."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(Object.keys(RANGES) as RangeId[]).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRange(id)}
                  className={`admin-tab${range === id ? ' admin-tab--active' : ''}`}
                  style={{ fontSize: 12 }}
                >
                  {RANGES[id].label}
                </button>
              ))}
            </div>
            <Button onClick={() => void refresh()} disabled={refreshing} size="sm">
              {refreshing ? 'Pulling…' : 'Refresh from Meta'}
            </Button>
          </div>
        }
      />
      <AdsTabBar />

      {refreshError ? (
        <div className="mb-4 rounded-lg border border-[var(--color-admin-danger)]/30 bg-[var(--color-admin-danger)]/10 p-3 text-sm text-[var(--color-admin-danger)]">{refreshError}</div>
      ) : null}
      {refreshNote ? (
        <div className="mb-4 rounded-lg border border-[var(--color-admin-success)]/30 bg-[var(--color-admin-success-soft)] p-3 text-sm">{refreshNote}</div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Spend" value={`£${totals.spend.toFixed(2)}`} />
        <Kpi label="Revenue (attributed)" value={`£${totals.revenue.toFixed(2)}`} />
        <Kpi label="ROAS" value={totals.spend ? `${totalRoas.toFixed(2)}x` : '—'} />
        <Kpi label="Conversions" value={String(totals.conversions)} />
        <Kpi label="Impressions" value={totals.impressions.toLocaleString()} />
      </div>

      <Card>
        <CardHeader title="By campaign" description={`${perCampaign.length} campaign${perCampaign.length === 1 ? '' : 's'} with activity in this window`} />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div>
          ) : perCampaign.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[var(--color-admin-muted)]">
              No insights data yet. Hit "Refresh from Meta" — once you have campaigns live in Ads Manager you'll see spend / impressions / ROAS here.
            </div>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Campaign</Th>
                  <Th className="text-right">Spend</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">ROAS</Th>
                  <Th className="text-right">CTR</Th>
                  <Th className="text-right">Impr.</Th>
                  <Th className="text-right">Clicks</Th>
                  <Th className="text-right">Conv.</Th>
                </Tr>
              </THead>
              <TBody>
                {perCampaign.map(c => (
                  <Tr key={c.fb_campaign_id}>
                    <Td className="font-medium text-[var(--color-admin-text-strong)]">
                      {c.name}
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-admin-muted)]">{c.days_active} day{c.days_active === 1 ? '' : 's'} active</div>
                    </Td>
                    <Td className="text-right tabular-nums">£{c.spend_pounds.toFixed(2)}</Td>
                    <Td className="text-right tabular-nums">£{c.revenue_pounds.toFixed(2)}</Td>
                    <Td className={`text-right tabular-nums font-medium ${c.roas >= 1 ? 'text-[var(--color-admin-success)]' : 'text-[var(--color-admin-muted)]'}`}>
                      {c.spend_pounds ? `${c.roas.toFixed(2)}x` : '—'}
                    </Td>
                    <Td className="text-right tabular-nums">{c.ctr.toFixed(2)}%</Td>
                    <Td className="text-right tabular-nums">{c.impressions.toLocaleString()}</Td>
                    <Td className="text-right tabular-nums">{c.clicks.toLocaleString()}</Td>
                    <Td className="text-right tabular-nums">{c.conversions}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-kpi rounded-xl border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-admin-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-admin-text-strong)]">{value}</div>
    </div>
  )
}
