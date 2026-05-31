import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'

export default function SeoPage() {
  const editor = useSiteConfigEditor('seo_defaults')

  return (
    <>
      <PageHeader title="SEO defaults" description="Default meta tags used when a page doesn't supply its own." />
      <Card>
        <CardHeader title="Defaults" description="Per-page overrides come in Phase 2 with the legal pages and product editor." />
        <CardBody className="grid gap-4">
          <Label>
            Default title
            <Input
              value={editor.value.title}
              onChange={e => editor.setValue(v => ({ ...v, title: e.target.value }))}
            />
          </Label>
          <Label>
            Default description
            <Textarea
              rows={3}
              value={editor.value.description}
              onChange={e => editor.setValue(v => ({ ...v, description: e.target.value }))}
            />
          </Label>
          <Label hint="Absolute URL to a 1200x630 image, or leave blank.">
            Open Graph image URL
            <Input
              value={editor.value.og_image}
              onChange={e => editor.setValue(v => ({ ...v, og_image: e.target.value }))}
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
