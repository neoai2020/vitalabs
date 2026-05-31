import { PageHeader } from '../../../components/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { AdsTabBar } from './AdsTabBar'

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Ad Studio"
        description="Insights — spend, impressions, clicks, and conversion attribution by creative."
      />
      <AdsTabBar />

      <Card>
        <CardHeader title="Insights" description="Phase 5. Pulls daily insights from Meta and joins them to our orders / analytics_events to compute ROAS per creative." />
        <CardBody>
          <div className="rounded-lg border border-dashed border-[var(--color-admin-border)] p-8 text-center text-sm text-[var(--color-admin-muted)]">
            Coming in Phase 5. Once campaigns are running in Ads Manager, this tab will show spend vs revenue per creative — the missing piece that tells you which AI-generated ads are actually pulling weight.
          </div>
        </CardBody>
      </Card>
    </>
  )
}
