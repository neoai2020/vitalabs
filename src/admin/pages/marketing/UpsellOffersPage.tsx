import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { PreviewPanel } from '../../components/PreviewPanel'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface OfferRow {
  id: string
  product_id: string
  discount_pct: number
  timer_seconds: number
  headline: string | null
  subheadline: string | null
  cta: string | null
  active: boolean
  sort_order: number
}

const EMPTY = {
  product_id: '',
  discount_pct: 20,
  timer_seconds: 600,
  headline: '',
  subheadline: '',
  cta: 'Yes, upgrade my order',
  active: true,
  sort_order: 100,
}

export default function UpsellOffersPage() {
  const { data: offers = [], isLoading } = useBrandList<OfferRow>({
    table: 'upsell_offers',
    orderBy: { column: 'sort_order', ascending: true },
  })
  const { upsert, remove } = useBrandMutation({ table: 'upsell_offers' })
  const [draft, setDraft] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!draft.product_id) { setError('Product ID is required'); return }
    try {
      await upsert.mutateAsync({ row: draft })
      setDraft(EMPTY)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const previewUrl = useMemo(() => {
    const offer = {
      id: 'preview',
      product_id: draft.product_id || '17',
      discount_pct: draft.discount_pct,
      timer_seconds: draft.timer_seconds,
      headline: draft.headline || null,
      subheadline: draft.subheadline || null,
      cta: draft.cta || null,
      active: true,
      sort_order: draft.sort_order,
    }
    const encoded = encodeURIComponent(btoa(JSON.stringify(offer)))
    return `/upsell?preview=1&offer=${encoded}`
  }, [draft])

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Upsell offers" description="One-time upsell shown after the quiz. Edit the fields below to change the headline, sub-copy, CTA, discount %, and timer. The preview re-renders as you type." />

      <PreviewPanel
        className="mb-6"
        title="Upsell page preview"
        description="The actual /upsell page rendered with your draft values"
        defaultViewport="desktop"
      >
        {({ height }) => (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="Upsell preview"
            style={{
              width: '100%',
              height: height + 80,
              border: 0,
              display: 'block',
              background: '#ffffff',
            }}
          />
        )}
      </PreviewPanel>

      <Card className="mb-4">
        <CardHeader title="Add offer" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label hint="Stable product ID from the catalogue (e.g. 17)">Product ID<Input value={draft.product_id} onChange={e => setDraft(d => ({ ...d, product_id: e.target.value }))} /></Label>
          <Label>Discount %<Input type="number" step="0.01" value={draft.discount_pct} onChange={e => setDraft(d => ({ ...d, discount_pct: Number(e.target.value) }))} /></Label>
          <Label hint="Countdown duration in seconds (600 = 10 min)">Timer seconds<Input type="number" value={draft.timer_seconds} onChange={e => setDraft(d => ({ ...d, timer_seconds: Number(e.target.value) }))} /></Label>
          <Label>Sort order<Input type="number" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: Number(e.target.value) }))} /></Label>
          <Label className="sm:col-span-2">Headline<Input value={draft.headline} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} /></Label>
          <Label className="sm:col-span-2">Sub-headline<Input value={draft.subheadline} onChange={e => setDraft(d => ({ ...d, subheadline: e.target.value }))} /></Label>
          <Label>CTA<Input value={draft.cta} onChange={e => setDraft(d => ({ ...d, cta: e.target.value }))} /></Label>
          <div className="flex items-end gap-2">
            <Switch checked={draft.active} onChange={active => setDraft(d => ({ ...d, active }))} label="Active" />
            <span className="text-sm">Active</span>
          </div>
        </CardBody>
        <CardFooter>
          {error ? <span className="text-sm text-[var(--color-admin-danger)]">{error}</span> : <span />}
          <Button onClick={handleAdd} disabled={upsert.isPending}>{upsert.isPending ? 'Adding…' : 'Add offer'}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader title={`${offers.length} offers`} />
        {isLoading ? <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div> : (
          <Table>
            <THead>
              <Tr>
                <Th>Product</Th>
                <Th className="text-right">Discount</Th>
                <Th>Timer</Th>
                <Th>Headline</Th>
                <Th>Status</Th>
                <Th>Sort</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {offers.map(o => (
                <Tr key={o.id}>
                  <Td className="font-mono text-xs">{o.product_id}</Td>
                  <Td className="text-right">{o.discount_pct}%</Td>
                  <Td>{o.timer_seconds}s</Td>
                  <Td className="max-w-xs truncate">{o.headline ?? '—'}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.active ? 'bg-[var(--color-admin-success-soft)] text-[var(--color-admin-success)]' : 'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-muted)]'}`}>
                      {o.active ? 'Active' : 'Inactive'}
                    </span>
                  </Td>
                  <Td>{o.sort_order}</Td>
                  <Td className="text-right">
                    <button className="text-sm text-[var(--color-admin-danger)] hover:underline" onClick={() => { if (confirm('Delete this offer?')) void remove.mutate({ id: o.id }) }}>Delete</button>
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
