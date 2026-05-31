import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Switch } from '../../components/ui/Switch'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'

interface FlagRow {
  key: string
  label: string
  description: string
}

const KNOWN_FLAGS: FlagRow[] = [
  { key: 'whatsapp_enabled', label: 'WhatsApp widget enabled', description: 'Global kill switch. Overrides the widget config.' },
  { key: 'theme_toggle_enabled', label: 'Theme toggle visible', description: 'Show the dark/light mode toggle on public pages that opt in.' },
  { key: 'maintenance_mode', label: 'Maintenance mode', description: 'Future: when on, public routes show a maintenance message.' },
]

export default function FeatureFlagsPage() {
  const editor = useSiteConfigEditor('feature_flags')

  return (
    <>
      <PageHeader title="Feature flags" description="Toggle features on or off site-wide without redeploying." />
      <Card>
        <CardHeader title="Flags" />
        <CardBody className="flex flex-col gap-5">
          {KNOWN_FLAGS.map(flag => (
            <div key={flag.key} className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{flag.label}</div>
                <p className="text-xs text-[var(--color-admin-muted)]">{flag.description}</p>
              </div>
              <Switch
                checked={Boolean(editor.value[flag.key])}
                onChange={next => editor.setValue(v => ({ ...v, [flag.key]: next }))}
                label={`Toggle ${flag.label}`}
              />
            </div>
          ))}
        </CardBody>
        <CardFooter>
          <SaveBar {...editor} onSave={editor.save} />
        </CardFooter>
      </Card>
    </>
  )
}
