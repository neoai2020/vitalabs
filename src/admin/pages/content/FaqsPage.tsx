import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface FaqRow {
  id: string
  page: string
  question: string
  answer: string
  sort_order: number
}

const PAGE_OPTIONS = ['results', 'tsl', 'product', 'landing', 'checkout', 'other']

const EMPTY = { page: 'results', question: '', answer: '', sort_order: 100 }

export default function FaqsPage() {
  const { data: faqs = [], isLoading } = useBrandList<FaqRow>({
    table: 'faqs',
    orderBy: { column: 'sort_order', ascending: true },
  })
  const { upsert, remove } = useBrandMutation({ table: 'faqs' })
  const [draft, setDraft] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!draft.question || !draft.answer) { setError('Question and answer are required'); return }
    try {
      await upsert.mutateAsync({ row: draft })
      setDraft(EMPTY)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const handleInlineEdit = async (row: FaqRow, patch: Partial<FaqRow>) => {
    try { await upsert.mutateAsync({ row: { ...row, ...patch } }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <>
      <PageHeader title="FAQs" description="Q&A blocks shown on the results, TSL, and product pages." />

      <Card className="mb-4">
        <CardHeader title="Add FAQ" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label>Page
            <select className="h-10 rounded-md border border-[var(--color-admin-border)] bg-white px-3 text-sm" value={draft.page} onChange={e => setDraft(d => ({ ...d, page: e.target.value }))}>
              {PAGE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Label>
          <Label>Sort order<Input type="number" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: Number(e.target.value) }))} /></Label>
          <Label className="sm:col-span-2">Question<Input value={draft.question} onChange={e => setDraft(d => ({ ...d, question: e.target.value }))} /></Label>
          <Label className="sm:col-span-2">Answer<Textarea rows={3} value={draft.answer} onChange={e => setDraft(d => ({ ...d, answer: e.target.value }))} /></Label>
        </CardBody>
        <CardFooter>
          {error ? <span className="text-sm text-[var(--color-admin-danger)]">{error}</span> : <span />}
          <Button onClick={handleAdd} disabled={upsert.isPending}>{upsert.isPending ? 'Adding…' : 'Add FAQ'}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader title={`All FAQs (${faqs.length})`} />
        {isLoading ? <div className="px-6 py-6 text-sm text-[var(--color-admin-muted)]">Loading…</div> : (
          <Table>
            <THead>
              <Tr>
                <Th>Page</Th>
                <Th>Question</Th>
                <Th>Answer</Th>
                <Th>Sort</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {faqs.map(f => (
                <Tr key={f.id}>
                  <Td>{f.page}</Td>
                  <Td className="font-medium max-w-xs truncate" title={f.question}>{f.question}</Td>
                  <Td className="max-w-md truncate" title={f.answer}>{f.answer}</Td>
                  <Td>
                    <Input
                      type="number"
                      defaultValue={f.sort_order}
                      onBlur={e => { const n = Number(e.target.value); if (n !== f.sort_order) void handleInlineEdit(f, { sort_order: n }) }}
                      className="h-8 w-20"
                    />
                  </Td>
                  <Td className="text-right">
                    <button
                      className="text-sm text-[var(--color-admin-danger)] hover:underline"
                      onClick={() => { if (confirm('Delete this FAQ?')) void remove.mutate({ id: f.id }) }}
                    >Delete</button>
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
