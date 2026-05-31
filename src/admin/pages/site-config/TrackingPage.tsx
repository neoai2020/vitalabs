import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { SaveBar } from '../../components/SaveBar'
import { useSiteConfigEditor } from '../../hooks/useSiteConfigEditor'
import type { PixelEntry, TrackingConfig } from '../../../lib/config/types'

type PixelKey = keyof TrackingConfig

interface Row {
  key: PixelKey
  label: string
  idField: keyof PixelEntry
  idLabel: string
  description: string
}

const ROWS: Row[] = [
  { key: 'meta', label: 'Meta (Facebook) Pixel', idField: 'pixel_id', idLabel: 'Pixel ID', description: 'Numeric ID from Meta Events Manager.' },
  { key: 'google_tag', label: 'Google Tag (GA4 / Ads)', idField: 'tag_id', idLabel: 'Tag ID', description: 'Begins with G- (GA4) or AW- (Ads).' },
  { key: 'tiktok', label: 'TikTok Pixel', idField: 'pixel_id', idLabel: 'Pixel ID', description: 'Pixel code from TikTok Events Manager.' },
  { key: 'snap', label: 'Snap Pixel', idField: 'pixel_id', idLabel: 'Pixel ID', description: 'Snap Pixel ID from Ads Manager.' },
  { key: 'twitter', label: 'X (Twitter) Pixel', idField: 'pixel_id', idLabel: 'Pixel ID', description: 'Universal website tag pixel.' },
]

export default function TrackingPage() {
  const editor = useSiteConfigEditor('tracking')

  const updatePixel = (key: PixelKey, patch: Partial<PixelEntry>) => {
    editor.setValue(v => ({ ...v, [key]: { ...v[key], ...patch } }))
  }

  return (
    <>
      <PageHeader
        title="Tracking pixels"
        description="Enable, disable, or re-key any tracking pixel without redeploying code. Changes take effect on next page load."
      />
      <Card>
        <CardHeader title="Pixels" description="Only enabled pixels with a valid ID are loaded into the page." />
        <CardBody className="flex flex-col gap-6">
          {ROWS.map(row => {
            const entry = editor.value[row.key]
            const idValue = (entry[row.idField] ?? '') as string
            return (
              <div key={row.key} className="flex flex-col gap-3 border-b border-[var(--color-admin-border)] pb-5 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{row.label}</div>
                    <p className="text-xs text-[var(--color-admin-muted)]">{row.description}</p>
                  </div>
                  <Switch
                    checked={entry.enabled}
                    onChange={enabled => updatePixel(row.key, { enabled })}
                    label={`Toggle ${row.label}`}
                  />
                </div>
                <Label>
                  {row.idLabel}
                  <Input
                    value={idValue}
                    onChange={e => updatePixel(row.key, { [row.idField]: e.target.value } as Partial<PixelEntry>)}
                    placeholder={row.idField === 'tag_id' ? 'G-XXXXXXXXXX' : '1234567890123456'}
                    disabled={!entry.enabled}
                  />
                </Label>
              </div>
            )
          })}
        </CardBody>
        <CardFooter>
          <SaveBar {...editor} onSave={editor.save} />
        </CardFooter>
      </Card>
    </>
  )
}
