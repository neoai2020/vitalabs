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

function Row({ k, v, strong, highlight }: { k: string; v: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: strong ? 700 : 500, color: highlight ? '#0d9488' : strong ? '#0f172a' : '#475569' }}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  )
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

  const previewDiscount = useMemo(() => {
    const SUBTOTAL = 129
    if (draft.type === 'percent') return Math.min(SUBTOTAL, (SUBTOTAL * draft.value) / 100)
    if (draft.type === 'fixed') return Math.min(SUBTOTAL, draft.value)
    return 0
  }, [draft.type, draft.value])
  const previewSubtotal = 129
  const previewShipping = draft.type === 'free_shipping' ? 0 : 4.99
  const previewTotal = Math.max(0, previewSubtotal - previewDiscount) + previewShipping

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Promo codes" description="Discount codes validated at checkout. Codes are matched case-insensitively. The preview shows how a £129 cart looks with your draft code applied." />

      <PreviewPanel
        className="mb-6"
        title="Checkout preview"
        description="How a £129 order appears with your draft code applied"
        viewportToggle={false}
      >
        {() => (
          <div style={{ background: '#fff', padding: '20px 24px', fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Order summary</div>
            <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Retatrutide 12mg — 1 month</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>SKU RETA-12 · UK shipping</div>
              </div>
              <div style={{ fontWeight: 600 }}>£129.00</div>
            </div>

            <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontFamily: 'monospace', fontSize: 13, color: '#0f172a', background: '#f8fafc' }}>
                {draft.code || 'PROMO-CODE'}
              </div>
              <div style={{ background: '#10b981', color: 'white', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>Applied</div>
            </div>
            {draft.description ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>{draft.description}</div>
            ) : null}

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
              <Row k="Subtotal" v={`£${previewSubtotal.toFixed(2)}`} />
              <Row k={`Discount (${draft.code || 'CODE'})`} v={`-£${previewDiscount.toFixed(2)}`} highlight />
              <Row k="Shipping" v={draft.type === 'free_shipping' ? 'FREE' : `£${previewShipping.toFixed(2)}`} highlight={draft.type === 'free_shipping'} />
              <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
              <Row k="Total" v={`£${previewTotal.toFixed(2)}`} strong />
            </div>

            <button style={{ marginTop: 16, width: '100%', background: '#143F66', color: 'white', padding: '12px', borderRadius: 8, fontWeight: 600, border: 0, fontSize: 14 }}>
              Pay £{previewTotal.toFixed(2)}
            </button>
          </div>
        )}
      </PreviewPanel>

      <Card className="mb-4">
        <CardHeader title="Add promo code" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label>Code<Input value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" /></Label>
          <Label>Type
            <select className="h-10 rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-bg-soft)] px-3 text-sm text-[var(--color-admin-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-primary)]" value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as PromoType }))}>
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
                    <button onClick={() => void toggleActive(c)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.active ? 'bg-[var(--color-admin-success-soft)] text-[var(--color-admin-success)]' : 'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-muted)]'}`}>
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
