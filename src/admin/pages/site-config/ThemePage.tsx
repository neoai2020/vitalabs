import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'

export default function ThemePage() {
  const editor = useSiteConfigEditor('theme')

  return (
    <>
      <PageHeader title="Theme" description="Brand colours surfaced as CSS variables to public pages." />
      <Card>
        <CardHeader title="Colours" description="Hex codes. Applied via CSS variables on next page load." />
        <CardBody className="grid gap-4">
          <Label hint="Used for primary CTAs, headlines, and the navy navigation bar.">
            Primary
            <div className="flex items-center gap-3">
              <Input
                type="text"
                value={editor.value.primary_color}
                onChange={e => editor.setValue(v => ({ ...v, primary_color: e.target.value }))}
                className="font-mono"
              />
              <input
                type="color"
                value={editor.value.primary_color}
                onChange={e => editor.setValue(v => ({ ...v, primary_color: e.target.value }))}
                className="h-10 w-12 cursor-pointer rounded border border-[var(--color-admin-border)]"
              />
            </div>
          </Label>
          <Label hint="Used for secondary text and subtle accents (e.g. the 'LABS' subtitle on the logo).">
            Accent
            <div className="flex items-center gap-3">
              <Input
                type="text"
                value={editor.value.accent_color}
                onChange={e => editor.setValue(v => ({ ...v, accent_color: e.target.value }))}
                className="font-mono"
              />
              <input
                type="color"
                value={editor.value.accent_color}
                onChange={e => editor.setValue(v => ({ ...v, accent_color: e.target.value }))}
                className="h-10 w-12 cursor-pointer rounded border border-[var(--color-admin-border)]"
              />
            </div>
          </Label>
        </CardBody>
        <CardFooter>
          <SaveBar {...editor} onSave={editor.save} />
        </CardFooter>
      </Card>
    </>
  )
}
