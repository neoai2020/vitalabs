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
        description="The Facebook ad account, Page, and (optional) Instagram actor used when the Ad Studio publishes campaign drafts for this brand. The long-lived system user token is set as a Supabase secret — only ad_account_id and page_id live here."
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

          <div className="rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3 text-xs leading-relaxed text-[var(--color-admin-muted)]">
            <strong className="font-medium text-[var(--color-admin-text)]">System user token: </strong>
            Set once as a Supabase Edge Function secret named <code className="rounded bg-[var(--color-admin-surface-elevated)] px-1 py-0.5 font-mono">META_SYSTEM_USER_TOKEN</code>.
            One token works for both brands because they share a Business Manager. Scopes required:{' '}
            <code className="rounded bg-[var(--color-admin-surface-elevated)] px-1 py-0.5 font-mono">ads_management</code>,{' '}
            <code className="rounded bg-[var(--color-admin-surface-elevated)] px-1 py-0.5 font-mono">ads_read</code>,{' '}
            <code className="rounded bg-[var(--color-admin-surface-elevated)] px-1 py-0.5 font-mono">business_management</code>,{' '}
            <code className="rounded bg-[var(--color-admin-surface-elevated)] px-1 py-0.5 font-mono">pages_read_engagement</code>.
          </div>
        </CardBody>
        <CardFooter>
          <SaveBar {...editor} onSave={editor.save} />
        </CardFooter>
      </Card>
    </>
  )
}
