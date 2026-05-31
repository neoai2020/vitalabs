import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Table, TBody, THead, Th, Td, Tr } from '../../../components/ui/Table'
import { StatusPill, type StatusTone } from '../../../components/ui/StatusPill'
import { useBrandList } from '../../../hooks/useBrandQuery'
import { useAdminBrand } from '../../../context/AdminBrandContext'
import { useConfig } from '../../../../lib/config/ConfigProvider'
import { supabase } from '../../../../lib/supabase'
import { AdsTabBar } from './AdsTabBar'

interface CampaignRow {
  id: string
  name: string
  objective: string
  status: 'draft_local' | 'draft_synced' | 'live_external' | 'archived'
  fb_campaign_id: string | null
  daily_budget_pence: number | null
  last_sync_error: string | null
  created_at: string
}

interface CreativeRow {
  id: string
  kind: 'image' | 'video'
  generator: string
  public_url: string
  thumbnail_url: string | null
  aspect_ratio: string
  status: 'ready' | 'failed' | 'archived'
  product_id: string | null
  prompt: string | null
}

const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  draft_local: 'Local draft',
  draft_synced: 'Synced draft',
  live_external: 'Live',
  archived: 'Archived',
}

const STATUS_TONE: Record<CampaignRow['status'], StatusTone> = {
  draft_local:   'neutral',
  draft_synced:  'info',
  live_external: 'success',
  archived:      'neutral',
}

const OBJECTIVES = [
  { id: 'OUTCOME_SALES', label: 'Sales' },
  { id: 'OUTCOME_LEADS', label: 'Leads' },
  { id: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { id: 'OUTCOME_AWARENESS', label: 'Awareness' },
  { id: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
]

export default function CampaignsPage() {
  const { brand } = useAdminBrand()
  const { config } = useConfig()
  const queryClient = useQueryClient()
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: campaigns = [], isLoading } = useBrandList<CampaignRow>({
    table: 'ad_campaigns',
    orderBy: { column: 'created_at', ascending: false },
  })
  const { data: creatives = [] } = useBrandList<CreativeRow>({
    table: 'ad_creatives',
    orderBy: { column: 'created_at', ascending: false },
  })

  const readyCreatives = useMemo(
    () => creatives.filter(c => c.status === 'ready' && c.public_url),
    [creatives],
  )

  const metaReady = Boolean(config.meta_ads?.ad_account_id && config.meta_ads?.page_id)
  const accountIdRaw = config.meta_ads?.ad_account_id ?? ''
  const accountId = accountIdRaw.startsWith('act_') ? accountIdRaw : `act_${accountIdRaw}`

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Ad Studio"
        description="Bundle creatives into Facebook campaign drafts. Every campaign is pushed as paused — you launch it from Ads Manager when you’re ready."
        actions={
          <Button
            onClick={() => setWizardOpen(true)}
            disabled={!metaReady || readyCreatives.length === 0}
          >
            New campaign
          </Button>
        }
      />
      <AdsTabBar />

      {!metaReady ? (
        <div className="mb-4 rounded-md border border-[var(--color-admin-warning)]/30 bg-[var(--color-admin-warning-soft)] px-4 py-3 text-[13px]">
          <strong className="font-medium text-[var(--color-admin-warning)]">Meta Ads not configured.</strong>{' '}
          <span className="text-[var(--color-admin-text)]">
            Add the ad account ID and Page ID in <a href="/admin/site-config/meta-ads" className="underline underline-offset-2 hover:text-[var(--color-admin-primary)]">Site config → Meta Ads</a> before publishing campaigns.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Campaigns"
          description="Each campaign here mirrors a Meta campaign object. Once synced, Ads Manager is the source of truth for the launch decision."
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[var(--color-admin-muted)]">
              No campaigns yet. Click "New campaign" to bundle creatives and push a paused draft to Meta.
            </div>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Objective</Th>
                  <Th>Daily budget</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th className="text-right">—</Th>
                </Tr>
              </THead>
              <TBody>
                {campaigns.map(c => (
                  <Tr key={c.id}>
                    <Td className="font-medium text-[var(--color-admin-text-strong)]">
                      {c.name}
                      {c.last_sync_error ? (
                        <div className="mt-0.5 text-xs text-[var(--color-admin-danger)]">{c.last_sync_error}</div>
                      ) : null}
                    </Td>
                    <Td>{OBJECTIVES.find(o => o.id === c.objective)?.label ?? c.objective}</Td>
                    <Td>{c.daily_budget_pence != null ? `£${(c.daily_budget_pence / 100).toFixed(2)}` : '—'}</Td>
                    <Td>
                      <StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill>
                    </Td>
                    <Td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      {c.fb_campaign_id && accountId !== 'act_' ? (
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${accountId.replace(/^act_/, '')}&selected_campaign_ids=${c.fb_campaign_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[13px] font-medium text-[var(--color-admin-text-strong)] underline-offset-2 hover:text-[var(--color-admin-primary)] hover:underline"
                        >
                          Open in Ads Manager ↗
                        </a>
                      ) : (
                        <span className="text-[12px] text-[var(--color-admin-subtle)]">Not synced</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {wizardOpen ? (
        <CampaignWizard
          brand={brand}
          creatives={readyCreatives}
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false)
            queryClient.invalidateQueries({ queryKey: ['ad_campaigns', brand] })
          }}
        />
      ) : null}
    </>
  )
}

interface WizardProps {
  brand: 'vitalabs' | 'peptiva'
  creatives: CreativeRow[]
  onClose: () => void
  onCreated: () => void
}

function CampaignWizard({ brand, creatives, onClose, onCreated }: WizardProps) {
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('OUTCOME_SALES')
  const [dailyBudget, setDailyBudget] = useState(20)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  // Single ad set MVP — multi-set support comes later. Keeping the model
  // flexible (publish-fb-campaign-draft already accepts an array) so we
  // can grow the wizard without server changes.
  const [adSetName, setAdSetName] = useState('Ad set 1')
  const [selectedCreativeIds, setSelectedCreativeIds] = useState<string[]>([])
  const [countries, setCountries] = useState('GB')
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(65)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ url: string } | null>(null)

  const toggleCreative = (id: string) => {
    setSelectedCreativeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  const canSubmit = name.trim() && selectedCreativeIds.length > 0 && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('publish-fb-campaign-draft', {
        body: {
          brand,
          campaign: {
            name,
            objective,
            daily_budget_pence: Math.round(dailyBudget * 100),
            start_at: startAt || null,
            end_at: endAt || null,
          },
          ad_sets: [
            {
              name: adSetName,
              creative_ids: selectedCreativeIds,
              targeting: {
                countries: countries.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
                age_min: ageMin,
                age_max: ageMax,
              },
            },
          ],
        },
      })
      if (invokeErr) throw new Error(invokeErr.message)
      const res = data as { ok?: boolean; error?: string; campaign?: { ads_manager_url?: string }; failures?: string[] }
      if (res?.failures?.length) {
        setError(`Campaign created but some pieces failed: ${res.failures.join(' · ')}`)
      }
      if (!res?.ok && !res?.failures?.length) throw new Error(res?.error ?? 'Publish failed')
      setSuccess({ url: res.campaign?.ads_manager_url ?? '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,18,22,0.35)] p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="admin-page-enter max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] shadow-[0_24px_64px_-24px_rgba(15,18,22,0.25),0_2px_4px_rgba(15,18,22,0.04)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-admin-border)] px-6 py-5">
          <div className="admin-eyebrow mb-1.5">New campaign</div>
          <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-admin-text-strong)]">Draft for Meta</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-admin-muted)]">
            Creates a paused campaign on Meta. You launch from Ads Manager when you’re ready.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col gap-4 px-6 py-6">
            <div className="rounded-md border border-[var(--color-admin-success)]/30 bg-[var(--color-admin-success-soft)] p-4 text-[13.5px]">
              <strong className="font-medium text-[var(--color-admin-success)]">Draft synced.</strong>
              <p className="mt-1 text-[var(--color-admin-text)]">
                Review the ad set, audience, and creatives in Meta Ads Manager, then launch when ready.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onCreated}>Close</Button>
              {success.url ? (
                <a href={success.url} target="_blank" rel="noreferrer">
                  <Button>Open in Ads Manager ↗</Button>
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 px-6 py-5">
              <Label>
                Campaign name
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Q1 acquisition test" />
              </Label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Label>
                  Objective
                  <Select value={objective} onChange={e => setObjective(e.target.value)}>
                    {OBJECTIVES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </Select>
                </Label>

                <Label hint="Total per day, in £. Split across ad sets when there's more than one.">
                  Daily budget (£)
                  <Input type="number" min={1} step={1} value={dailyBudget} onChange={e => setDailyBudget(Math.max(1, Number(e.target.value) || 0))} />
                </Label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Label hint="Optional. Blank means launch immediately.">
                  Start at
                  <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
                </Label>
                <Label hint="Optional. Blank means run indefinitely.">
                  End at
                  <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
                </Label>
              </div>

              <div className="rounded-md border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-sunken)] p-4">
                <div className="admin-eyebrow mb-3">Ad set</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Ad set name
                    <Input value={adSetName} onChange={e => setAdSetName(e.target.value)} />
                  </Label>
                  <Label hint="Comma-separated ISO country codes.">
                    Countries
                    <Input value={countries} onChange={e => setCountries(e.target.value)} placeholder="GB, US" />
                  </Label>
                  <Label>
                    Age min
                    <Input type="number" min={13} max={65} value={ageMin} onChange={e => setAgeMin(Number(e.target.value) || 18)} />
                  </Label>
                  <Label>
                    Age max
                    <Input type="number" min={13} max={65} value={ageMax} onChange={e => setAgeMax(Number(e.target.value) || 65)} />
                  </Label>
                </div>

                <div className="mt-5">
                  <div className="admin-eyebrow mb-2">
                    Creatives · {selectedCreativeIds.length} selected
                  </div>
                  {creatives.length === 0 ? (
                    <p className="text-[13px] text-[var(--color-admin-muted)]">No creatives available. Generate some in the Studio tab first.</p>
                  ) : (
                    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                      {creatives.map(c => {
                        const selected = selectedCreativeIds.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCreative(c.id)}
                            className={`relative overflow-hidden rounded-md border text-left transition-colors ${
                              selected
                                ? 'border-[var(--color-admin-text-strong)] ring-2 ring-[var(--color-admin-text-strong)] ring-offset-1 ring-offset-[var(--color-admin-surface-sunken)]'
                                : 'border-[var(--color-admin-border)] hover:border-[var(--color-admin-border-emphasis)]'
                            }`}
                          >
                            <div className="aspect-square w-full bg-[var(--color-admin-surface)]">
                              {c.kind === 'image' ? (
                                <img src={c.public_url} alt="" className="h-full w-full object-cover" />
                              ) : c.thumbnail_url ? (
                                <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="admin-mono grid h-full w-full place-items-center text-[10px] text-[var(--color-admin-muted)]">VIDEO</div>
                              )}
                            </div>
                            <div className="admin-mono px-2 py-1 text-[10px] text-[var(--color-admin-muted)]">
                              {c.kind} · {c.aspect_ratio}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <CardFooter>
              {error
                ? <span className="mr-auto text-[12px] text-[var(--color-admin-danger)]">{error}</span>
                : <span className="mr-auto text-[12px] text-[var(--color-admin-muted)]">Will arrive on Meta as paused.</span>}
              <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button onClick={() => void submit()} disabled={!canSubmit}>
                {submitting ? 'Syncing…' : 'Create and sync'}
              </Button>
            </CardFooter>
          </>
        )}
      </div>
    </div>
  )
}
