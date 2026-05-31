import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'

export default function BrandPage() {
  const editor = useSiteConfigEditor('brand_info')

  return (
    <>
      <PageHeader title="Brand" description="Display name, support email, and tagline shown across the site." />
      <Card>
        <CardHeader title="Brand info" />
        <CardBody className="grid gap-4">
          <Label hint="Public name used in footers, emails, and SEO defaults.">
            Brand name
            <Input
              value={editor.value.name}
              onChange={e => editor.setValue(v => ({ ...v, name: e.target.value }))}
            />
          </Label>
          <Label hint="Surfaced in mailto links and the support page.">
            Support email
            <Input
              type="email"
              value={editor.value.support_email}
              onChange={e => editor.setValue(v => ({ ...v, support_email: e.target.value }))}
            />
          </Label>
          <Label hint="Short marketing phrase used on the homepage hero and meta description.">
            Tagline
            <Input
              value={editor.value.tagline}
              onChange={e => editor.setValue(v => ({ ...v, tagline: e.target.value }))}
            />
          </Label>
        </CardBody>
        <CardFooter>
          <SaveBar {...editor} onSave={editor.save} />
        </CardFooter>
      </Card>
    </>
  )
}
