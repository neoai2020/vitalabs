import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { PreviewPanel } from '../../components/PreviewPanel'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Button } from '../../components/ui/Button'
import { StatusPill } from '../../components/ui/StatusPill'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'
import Banner from '../../../components/Banner'

interface BannerRow {
  id: string
  message: string
  link: string | null
  background_color: string
  text_color: string
  start_at: string | null
  end_at: string | null
  active: boolean
  sort_order: number
}

const EMPTY = {
  message: '',
  link: '',
  background_color: '#143F66',
  text_color: '#ffffff',
  start_at: '',
  end_at: '',
  active: true,
  sort_order: 100,
}

export default function BannersPage() {
  const { data: banners = [], isLoading } = useBrandList<BannerRow>({
    table: 'banners',
    orderBy: { column: 'sort_order', ascending: true },
  })
  const { upsert, remove } = useBrandMutation({ table: 'banners' })
  const [draft, setDraft] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!draft.message) { setError('Message is required'); return }
    try {
      await upsert.mutateAsync({ row: {
        ...draft,
        link: draft.link || null,
        start_at: draft.start_at || null,
        end_at: draft.end_at || null,
      } })
      setDraft(EMPTY)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const toggleActive = async (row: BannerRow) => {
    try { await upsert.mutateAsync({ row: { ...row, active: !row.active } }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Banners" description="Promotional strips shown site-wide above the navigation. Only the first eligible banner (by sort_order, in window, active) is shown." />

      <PreviewPanel
        className="mb-6"
        title="Live preview"
        description="Updates as you edit the form below"
        viewportToggle={false}
      >
        {() => (
          <div style={{ background: '#fff', minHeight: 40 }}>
            <Banner override={{
              message: draft.message || 'Your banner message will appear here',
              link: draft.link || null,
              background_color: draft.background_color,
              text_color: draft.text_color,
            }} />
            <div style={{ padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#143F66', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>VL</div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Vita Labs</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b' }}>
                <span>Quiz</span><span>Shop</span><span>Reviews</span>
              </div>
            </div>
          </div>
        )}
      </PreviewPanel>

      <Card className="mb-4">
        <CardHeader title="Add banner" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label className="sm:col-span-2">Message<Input value={draft.message} onChange={e => setDraft(d => ({ ...d, message: e.target.value }))} placeholder="Free UK shipping this week" /></Label>
          <Label hint="Optional. Wraps the banner in a link.">Link URL<Input value={draft.link} onChange={e => setDraft(d => ({ ...d, link: e.target.value }))} /></Label>
          <Label>Sort order<Input type="number" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: Number(e.target.value) }))} /></Label>
          <Label>Background colour
            <div className="flex items-center gap-2">
              <Input value={draft.background_color} onChange={e => setDraft(d => ({ ...d, background_color: e.target.value }))} className="font-mono" />
              <input type="color" value={draft.background_color} onChange={e => setDraft(d => ({ ...d, background_color: e.target.value }))} className="h-10 w-12 rounded border border-[var(--color-admin-border)]" />
            </div>
          </Label>
          <Label>Text colour
            <div className="flex items-center gap-2">
              <Input value={draft.text_color} onChange={e => setDraft(d => ({ ...d, text_color: e.target.value }))} className="font-mono" />
              <input type="color" value={draft.text_color} onChange={e => setDraft(d => ({ ...d, text_color: e.target.value }))} className="h-10 w-12 rounded border border-[var(--color-admin-border)]" />
            </div>
          </Label>
          <Label hint="Blank means show immediately">Start at<Input type="datetime-local" value={draft.start_at} onChange={e => setDraft(d => ({ ...d, start_at: e.target.value }))} /></Label>
          <Label hint="Blank means show indefinitely">End at<Input type="datetime-local" value={draft.end_at} onChange={e => setDraft(d => ({ ...d, end_at: e.target.value }))} /></Label>
          <div className="flex items-end gap-2">
            <Switch checked={draft.active} onChange={active => setDraft(d => ({ ...d, active }))} label="Active" />
            <span className="text-sm">Active</span>
          </div>
        </CardBody>
        <CardFooter>
          {error ? <span className="text-sm text-[var(--color-admin-danger)]">{error}</span> : <span />}
          <Button onClick={handleAdd} disabled={upsert.isPending}>{upsert.isPending ? 'Adding…' : 'Add banner'}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader title={`${banners.length} banners`} />
        {isLoading ? <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div> : (
          <Table>
            <THead>
              <Tr>
                <Th>Preview</Th>
                <Th>Message</Th>
                <Th>Window</Th>
                <Th>Status</Th>
                <Th>Sort</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {banners.map(b => (
                <Tr key={b.id}>
                  <Td>
                    <span style={{ background: b.background_color, color: b.text_color, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      Preview
                    </span>
                  </Td>
                  <Td className="max-w-xs truncate">{b.message}</Td>
                  <Td className="text-xs">
                    {b.start_at ? new Date(b.start_at).toLocaleDateString() : '—'} → {b.end_at ? new Date(b.end_at).toLocaleDateString() : '—'}
                  </Td>
                  <Td>
                    <button type="button" onClick={() => void toggleActive(b)} className="appearance-none">
                      <StatusPill tone={b.active ? 'success' : 'neutral'}>
                        {b.active ? 'Active' : 'Inactive'}
                      </StatusPill>
                    </button>
                  </Td>
                  <Td>{b.sort_order}</Td>
                  <Td className="text-right">
                    <button className="text-[13px] text-[var(--color-admin-danger)] hover:underline" onClick={() => { if (confirm('Delete this banner?')) void remove.mutate({ id: b.id }) }}>Delete</button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  )
}
