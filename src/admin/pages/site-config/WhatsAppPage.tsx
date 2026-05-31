import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'

export default function WhatsAppPage() {
  const editor = useSiteConfigEditor('whatsapp')

  const hiddenRoutesText = editor.value.hidden_routes.join('\n')

  return (
    <>
      <PageHeader title="WhatsApp widget" description="The floating green chat button. Phone number, default message, and where it should hide." />
      <Card>
        <CardHeader title="Widget settings" />
        <CardBody className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Enabled</div>
              <p className="text-xs text-[var(--color-admin-muted)]">Master switch for the widget across the site.</p>
            </div>
            <Switch
              checked={editor.value.enabled}
              onChange={enabled => editor.setValue(v => ({ ...v, enabled }))}
              label="Enable WhatsApp widget"
            />
          </div>
          <Label hint="International format without the + sign. e.g. 447440153510 for +44 7440 153510.">
            Phone number
            <Input
              value={editor.value.phone}
              onChange={e => editor.setValue(v => ({ ...v, phone: e.target.value }))}
            />
          </Label>
          <Label hint="Pre-filled chat message when the user taps the widget.">
            Default message
            <Input
              value={editor.value.default_message}
              onChange={e => editor.setValue(v => ({ ...v, default_message: e.target.value }))}
            />
          </Label>
          <Label hint="One path per line. The widget is hidden on these routes. Default: /checkout (avoids overlapping the sticky pay bar).">
            Hidden routes
            <Textarea
              rows={4}
              value={hiddenRoutesText}
              onChange={e => editor.setValue(v => ({
                ...v,
                hidden_routes: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
              }))}
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
