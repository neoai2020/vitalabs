import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface PromoRow {
  id: string
  code: string
  type: 'percent' | 'fixed' | 'free_shipping'
  value: number
  max_uses: number | null
  uses: number
  expires_at: string | null
  active: boolean
  description: string | null
}

type PromoType = 'percent' | 'fixed' | 'free_shipping'

interface Draft {
  code: string
  type: PromoType
  value: number
  max_uses: string
  expires_at: string
  description: string
  active: boolean
}

const EMPTY: Draft = {
  code: '',
  type: 'percent',
  value: 10,
  max_uses: '',
  expires_at: '',
  description: '',
  active: true,
}

export default function PromoCodesPage() {
  const { data: codes = [], isLoading } = useBrandList<PromoRow>({
    table: 'promo_codes',
    orderBy: { column: 'created_at', ascending: false },
  })
  const { upsert, remove } = useBrandMutation({ table: 'promo_codes' })
  const [draft, setDraft] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!draft.code) { setError('Code is required'); return }
    try {
      await upsert.mutateAsync({ row: {
        code: draft.code.toUpperCase().trim(),
        type: draft.type,
        value: Number(draft.value),
        max_uses: draft.max_uses ? Number(draft.max_uses) : null,
        expires_at: draft.expires_at || null,
        description: draft.description || null,
        active: draft.active,
      }, onConflict: 'brand,code' })
      setDraft(EMPTY)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const toggleActive = async (row: PromoRow) => {
    try { await upsert.mutateAsync({ row: { ...row, active: !row.active } }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <>
      <PageHeader title="Promo codes" description="Discount codes validated at checkout. Codes are matched case-insensitively." />

      <Card className="mb-4">
        <CardHeader title="Add promo code" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label>Code<Input value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" /></Label>
          <Label>Type
            <select className="h-10 rounded-md border border-[var(--color-admin-border)] bg-white px-3 text-sm" value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as PromoType }))}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed £ off</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </Label>
          <Label hint={draft.type === 'percent' ? 'Percentage, 0–100' : 'Pounds'}>Value<Input type="number" step="0.01" value={draft.value} onChange={e => setDraft(d => ({ ...d, value: Number(e.target.value) }))} /></Label>
          <Label hint="Blank for unlimited">Max uses<Input type="number" value={draft.max_uses} onChange={e => setDraft(d => ({ ...d, max_uses: e.target.value }))} /></Label>
          <Label hint="Blank for no expiry">Expires at<Input type="datetime-local" value={draft.expires_at} onChange={e => setDraft(d => ({ ...d, expires_at: e.target.value }))} /></Label>
          <div className="flex items-end gap-2">
            <Switch checked={draft.active} onChange={active => setDraft(d => ({ ...d, active }))} label="Active" />
            <span className="text-sm">Active</span>
          </div>
          <Label className="sm:col-span-2">Description (admin only)<Input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} /></Label>
        </CardBody>
        <CardFooter>
          {error ? <span className="text-sm text-[var(--color-admin-danger)]">{error}</span> : <span />}
          <Button onClick={handleAdd} disabled={upsert.isPending}>{upsert.isPending ? 'Adding…' : 'Add code'}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader title={`${codes.length} codes`} />
        {isLoading ? <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div> : (
          <Table>
            <THead>
              <Tr>
                <Th>Code</Th>
                <Th>Type</Th>
                <Th className="text-right">Value</Th>
                <Th>Uses</Th>
                <Th>Expires</Th>
                <Th>Status</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {codes.map(c => (
                <Tr key={c.id}>
                  <Td className="font-mono font-semibold">{c.code}</Td>
                  <Td>{c.type}</Td>
                  <Td className="text-right">{c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? `£${c.value.toFixed(2)}` : '—'}</Td>
                  <Td>{c.uses}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}</Td>
                  <Td className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString() : '—'}</Td>
                  <Td>
                    <button onClick={() => void toggleActive(c)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </button>
                  </Td>
                  <Td className="text-right">
                    <button className="text-sm text-[var(--color-admin-danger)] hover:underline" onClick={() => { if (confirm('Delete this code?')) void remove.mutate({ id: c.id }) }}>Delete</button>
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
