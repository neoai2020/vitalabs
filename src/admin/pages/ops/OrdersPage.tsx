import Papa from 'papaparse'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface OrderRow {
  id: string
  stripe_id: string | null
  uprails_id: string | null
  email: string | null
  customer_name: string | null
  items: Array<{ sku?: string; compound?: string; quantity?: number; price?: number }>
  total: number
  currency: string
  status: 'pending' | 'paid' | 'fulfilled' | 'refunded' | 'cancelled' | 'failed'
  created_at: string
}

const STATUS_COLOURS: Record<OrderRow['status'], string> = {
  pending: 'bg-[var(--color-admin-warning-soft)] text-[var(--color-admin-warning)]',
  paid: 'bg-[var(--color-admin-success-soft)] text-[var(--color-admin-success)]',
  fulfilled: 'bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)]',
  refunded: 'bg-[var(--color-admin-warning-soft)] text-[var(--color-admin-warning)]',
  cancelled: 'bg-[var(--color-admin-surface-elevated)] text-[var(--color-admin-muted)]',
  failed: 'bg-[var(--color-admin-danger-soft)] text-[var(--color-admin-danger)]',
}

function downloadCsv(orders: OrderRow[]) {
  const rows = orders.map(o => ({
    id: o.id,
    created_at: o.created_at,
    email: o.email,
    customer_name: o.customer_name,
    total: o.total,
    currency: o.currency,
    status: o.status,
    stripe_id: o.stripe_id,
    uprails_id: o.uprails_id,
    items: o.items.map(i => `${i.sku ?? ''} ${i.compound ?? ''}`.trim()).join(' | '),
  }))
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useBrandList<OrderRow>({
    table: 'orders',
    orderBy: { column: 'created_at', ascending: false },
  })
  const { upsert } = useBrandMutation({ table: 'orders' })

  const markRefunded = (order: OrderRow) => {
    if (!confirm(`Mark order ${order.id.slice(0, 8)} as refunded? You still need to issue the refund in Stripe/Uprails manually.`)) return
    void upsert.mutateAsync({ row: { ...order, status: 'refunded' }, onConflict: 'id' })
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders persisted by the order-webhook Edge Function. Refunds are recorded here but must be issued in Stripe/Uprails separately."
        actions={<Button variant="secondary" onClick={() => downloadCsv(orders)} disabled={orders.length === 0}>Export CSV</Button>}
      />
      <Card>
        <CardHeader title={`${orders.length} orders`} />
        {isLoading ? <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div> : (
          <Table>
            <THead>
              <Tr>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th>Stripe / Uprails</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {orders.map(o => (
                <Tr key={o.id}>
                  <Td className="text-xs">{new Date(o.created_at).toLocaleString()}</Td>
                  <Td>
                    <div className="font-medium">{o.customer_name ?? '—'}</div>
                    <div className="text-xs text-[var(--color-admin-muted)]">{o.email ?? ''}</div>
                  </Td>
                  <Td className="max-w-xs truncate">
                    {o.items.map(i => `${i.sku ?? ''} ${i.compound ?? ''}`.trim()).filter(Boolean).join(', ')}
                  </Td>
                  <Td className="text-right font-medium">{o.currency} {Number(o.total).toFixed(2)}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[o.status]}`}>{o.status}</span>
                  </Td>
                  <Td className="font-mono text-xs">
                    {o.stripe_id ? <div>S: {o.stripe_id.slice(0, 12)}…</div> : null}
                    {o.uprails_id ? <div>U: {o.uprails_id.slice(0, 12)}…</div> : null}
                  </Td>
                  <Td className="text-right">
                    {o.status === 'paid' || o.status === 'fulfilled' ? (
                      <button onClick={() => markRefunded(o)} className="text-sm text-[var(--color-admin-danger)] hover:underline">Mark refunded</button>
                    ) : null}
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
