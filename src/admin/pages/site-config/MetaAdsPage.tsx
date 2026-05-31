import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'

export default function MetaAdsPage() {
  const editor = useSiteConfigEditor('meta_ads')

  return (
    <>
      <PageHeader
        eyebrow="Site config"
        title="Meta Ads"
        description="The Facebook ad account, Page, and optional Instagram actor used when Ad Studio publishes campaign drafts. Brand-specific — the shared business token is configured separately."
      />

      <Card>
        <CardHeader title="Brand ad targets" />
        <CardBody className="grid gap-4">
          <Label hint="Format: act_<id>. Find it in Ads Manager → Account overview → Account ID.">
            Ad account ID
            <Input
              value={editor.value.ad_account_id}
              onChange={e => editor.setValue(v => ({ ...v, ad_account_id: e.target.value.trim() }))}
              placeholder="act_1234567890"
              className="font-mono"
            />
          </Label>

          <Label hint="The Facebook Page that publishes the ad. Open the Page → About → Page ID.">
            Page ID
            <Input
              value={editor.value.page_id}
              onChange={e => editor.setValue(v => ({ ...v, page_id: e.target.value.trim() }))}
              placeholder="123456789012345"
              className="font-mono"
            />
          </Label>

          <Label hint="Optional. Enables Instagram placements. Business Settings → Instagram Accounts → Connect → use the numeric ID.">
            Instagram actor ID (optional)
            <Input
              value={editor.value.instagram_actor_id}
              onChange={e => editor.setValue(v => ({ ...v, instagram_actor_id: e.target.value.trim() }))}
              placeholder="17841401234567890"
              className="font-mono"
            />
          </Label>

          <div className="rounded-md border border-[var(--color-admin-border)] bg-[var(--color-admin-surface-sunken)] p-4 text-[12.5px] leading-relaxed text-[var(--color-admin-muted)]">
            <div className="admin-eyebrow mb-2">System user token</div>
            Configured once at the platform level so both brands share the same Business Manager
            integration. Required scopes:{' '}
            <span className="admin-mono text-[11.5px] text-[var(--color-admin-text-strong)]">ads_management</span>,{' '}
            <span className="admin-mono text-[11.5px] text-[var(--color-admin-text-strong)]">ads_read</span>,{' '}
            <span className="admin-mono text-[11.5px] text-[var(--color-admin-text-strong)]">business_management</span>,{' '}
            <span className="admin-mono text-[11.5px] text-[var(--color-admin-text-strong)]">pages_read_engagement</span>.
          </div>
        </CardBody>
        <CardFooter>
          <SaveBar {...editor} onSave={editor.save} />
        </CardFooter>
      </Card>
    </>
  )
}
