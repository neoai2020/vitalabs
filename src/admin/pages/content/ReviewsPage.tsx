import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Switch } from '../../components/ui/Switch'
import { Button } from '../../components/ui/Button'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface ReviewRow {
  id: string
  product_id: string | null
  author: string
  rating: number
  text: string
  source: string | null
  featured: boolean
  created_at: string
}

interface NewReview {
  author: string
  rating: number
  text: string
  source: string
  product_id: string
  featured: boolean
}

const EMPTY_NEW: NewReview = { author: '', rating: 5, text: '', source: '', product_id: '', featured: false }

export default function ReviewsPage() {
  const { data: reviews = [], isLoading } = useBrandList<ReviewRow>({
    table: 'reviews',
    orderBy: { column: 'created_at', ascending: false },
  })
  const { upsert, remove } = useBrandMutation({ table: 'reviews' })
  const [draft, setDraft] = useState<NewReview>(EMPTY_NEW)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!draft.author || !draft.text) { setError('Author and text are required'); return }
    try {
      await upsert.mutateAsync({ row: {
        author: draft.author,
        rating: draft.rating,
        text: draft.text,
        source: draft.source || null,
        product_id: draft.product_id || null,
        featured: draft.featured,
      } })
      setDraft(EMPTY_NEW)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add') }
  }

  return (
    <>
      <PageHeader title="Reviews" description="Customer testimonials shown on landing, results, and product pages." />

      <Card className="mb-4">
        <CardHeader title="Add review" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Label>Author<Input value={draft.author} onChange={e => setDraft(d => ({ ...d, author: e.target.value }))} /></Label>
          <Label>Source<Input value={draft.source} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))} placeholder="Trustpilot, Site, …" /></Label>
          <Label>Product ID<Input value={draft.product_id} onChange={e => setDraft(d => ({ ...d, product_id: e.target.value }))} placeholder="Blank for site-wide" /></Label>
          <Label>Rating
            <Select value={draft.rating} onChange={e => setDraft(d => ({ ...d, rating: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}
            </Select>
          </Label>
          <Label className="sm:col-span-2">Text<Textarea rows={3} value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} /></Label>
          <div className="flex items-center gap-2">
            <Switch checked={draft.featured} onChange={featured => setDraft(d => ({ ...d, featured }))} label="Featured" />
            <span className="text-sm">Featured</span>
          </div>
        </CardBody>
        <CardFooter>
          {error ? <span className="text-sm text-[var(--color-admin-danger)]">{error}</span> : <span />}
          <Button onClick={handleAdd} disabled={upsert.isPending}>{upsert.isPending ? 'Adding…' : 'Add review'}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader title={`All reviews (${reviews.length})`} />
        {isLoading ? (
          <div className="px-6 py-6 text-sm text-[var(--color-admin-muted)]">Loading…</div>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Author</Th>
                <Th>Rating</Th>
                <Th>Product</Th>
                <Th>Text</Th>
                <Th>Featured</Th>
                <Th className="text-right">—</Th>
              </Tr>
            </THead>
            <TBody>
              {reviews.map(r => (
                <Tr key={r.id}>
                  <Td className="font-medium">{r.author}</Td>
                  <Td>{r.rating}★</Td>
                  <Td className="font-mono text-xs">{r.product_id ?? '—'}</Td>
                  <Td className="max-w-md truncate" title={r.text}>{r.text}</Td>
                  <Td>{r.featured ? 'Yes' : ''}</Td>
                  <Td className="text-right">
                    <button
                      className="text-sm text-[var(--color-admin-danger)] hover:underline"
                      onClick={() => { if (confirm('Delete this review?')) void remove.mutate({ id: r.id }) }}
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
