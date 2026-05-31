import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
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

  return (
    <>
      <PageHeader title="Upsell offers" description="One-time upsell shown after the quiz. The active offer's timer_seconds drives the countdown on /upsell." />

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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
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
