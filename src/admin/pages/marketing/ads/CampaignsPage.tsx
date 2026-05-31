import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../../components/ui/Table'
import { useBrandList } from '../../../hooks/useBrandQuery'
import { AdsTabBar } from './AdsTabBar'

interface CampaignRow {
  id: string
  name: string
  objective: string
  status: 'draft_local' | 'draft_synced' | 'live_external' | 'archived'
  fb_campaign_id: string | null
  daily_budget_pence: number | null
  created_at: string
}

const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  draft_local: 'Local draft',
  draft_synced: 'Draft (Meta-synced)',
  live_external: 'Live in Ads Manager',
  archived: 'Archived',
}

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useBrandList<CampaignRow>({
    table: 'ad_campaigns',
    orderBy: { column: 'created_at', ascending: false },
  })

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Ad Studio"
        description="Bundle creatives into Facebook campaign drafts. Every campaign is pushed as PAUSED — you launch it from Ads Manager."
        actions={<Button disabled>New campaign</Button>}
      />
      <AdsTabBar />

      <Card>
        <CardHeader
          title="Campaigns"
          description="Each campaign here corresponds 1:1 with a Meta campaign object. Once synced, the Open in Ads Manager link is the source of truth for the launch decision."
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[var(--color-admin-muted)]">
              No campaigns yet. The "New campaign" wizard ships in Phase 4 with the Meta Marketing API integration.
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
                    <Td className="font-medium text-[var(--color-admin-text-strong)]">{c.name}</Td>
                    <Td>{c.objective}</Td>
                    <Td>{c.daily_budget_pence != null ? `£${(c.daily_budget_pence / 100).toFixed(2)}` : '—'}</Td>
                    <Td>
                      <span className="rounded-full bg-[var(--color-admin-surface-elevated)] px-2 py-0.5 text-xs text-[var(--color-admin-muted)]">
                        {STATUS_LABEL[c.status]}
                      </span>
                    </Td>
                    <Td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      {c.fb_campaign_id ? (
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${c.fb_campaign_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-[var(--color-admin-primary)] hover:underline"
                        >
                          Open in Ads Manager →
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--color-admin-muted)]">Not synced</span>
                      )}
                    </Td>
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
