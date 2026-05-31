import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList } from '../../hooks/useBrandQuery'

interface LeadRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  source: string | null
  utm: Record<string, string> | null
  created_at: string
}

function downloadCsv(rows: LeadRow[]) {
  const flat = rows.map(r => ({
    created_at: r.created_at,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    phone: r.phone,
    source: r.source,
    utm_source: r.utm?.utm_source ?? '',
    utm_medium: r.utm?.utm_medium ?? '',
    utm_campaign: r.utm?.utm_campaign ?? '',
  }))
  const csv = Papa.unparse(flat)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useBrandList<LeadRow>({
    table: 'leads',
    orderBy: { column: 'created_at', ascending: false },
  })
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return leads
    const q = search.toLowerCase()
    return leads.filter(l =>
      l.email.toLowerCase().includes(q) ||
      (l.first_name ?? '').toLowerCase().includes(q) ||
      (l.phone ?? '').includes(q) ||
      (l.source ?? '').toLowerCase().includes(q)
    )
  }, [leads, search])

  return (
    <>
      <PageHeader
        title="Leads"
        description="Email captures from the quiz funnel. Filter by email/name/phone/source."
        actions={<Button variant="secondary" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>Export CSV</Button>}
      />
      <Card>
        <CardHeader
          title={`${filtered.length} of ${leads.length} leads`}
          action={<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-64" />}
        />
        {isLoading ? <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div> : (
          <Table>
            <THead>
              <Tr>
                <Th>Date</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Source</Th>
                <Th>UTM</Th>
              </Tr>
            </THead>
            <TBody>
              {filtered.map(l => (
                <Tr key={l.id}>
                  <Td className="text-xs">{new Date(l.created_at).toLocaleString()}</Td>
                  <Td className="font-medium">{[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}</Td>
                  <Td>{l.email}</Td>
                  <Td>{l.phone ?? '—'}</Td>
                  <Td>{l.source ?? '—'}</Td>
                  <Td className="text-xs text-[var(--color-admin-muted)]">
                    {l.utm ? Object.entries(l.utm).map(([k, v]) => `${k.replace('utm_', '')}=${v}`).join(', ') : '—'}
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
