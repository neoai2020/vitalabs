import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Button } from '../../components/ui/Button'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface LegalRow {
  brand: string
  slug: string
  title: string
  body_md: string
  updated_at: string
}

export default function LegalPagesPage() {
  const { data: pages = [], isLoading } = useBrandList<LegalRow>({
    table: 'legal_pages',
    orderBy: { column: 'slug', ascending: true },
  })
  const { upsert } = useBrandMutation({ table: 'legal_pages' })

  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!editingSlug) return
    const p = pages.find(x => x.slug === editingSlug)
    if (p) { setTitle(p.title); setBody(p.body_md) }
  }, [editingSlug, pages])

  const handleSave = async (slug: string) => {
    setError(null)
    try {
      await upsert.mutateAsync({ row: { slug, title, body_md: body }, onConflict: 'brand,slug' })
      setEditingSlug(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed') }
  }

  return (
    <>
      <PageHeader title="Legal pages" description="Markdown bodies for terms, privacy, refund, disclaimer, and shipping." />

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-admin-danger)]">{error}</div> : null}

      {isLoading ? (
        <Card><CardBody className="text-sm text-[var(--color-admin-muted)]">Loading…</CardBody></Card>
      ) : pages.length === 0 ? (
        <Card><CardBody className="text-sm text-[var(--color-admin-muted)]">
          No legal pages seeded. Run <code>npx tsx scripts/seed-from-data-files.ts</code> to bootstrap the standard set.
        </CardBody></Card>
      ) : (
        <div className="grid gap-4">
          {pages.map(p => (
            <Card key={p.slug}>
              <CardHeader
                title={editingSlug === p.slug ? title : p.title}
                description={`/${p.slug} — updated ${new Date(p.updated_at).toLocaleString()}`}
              />
              <CardBody>
                {editingSlug === p.slug ? (
                  <div className="grid gap-3">
                    <Label>Title<Input value={title} onChange={e => setTitle(e.target.value)} /></Label>
                    <Label hint="Markdown supported. Toggle preview below.">Body
                      <Textarea rows={14} className="font-mono text-xs" value={body} onChange={e => setBody(e.target.value)} />
                    </Label>
                    <div>
                      <button className="text-xs text-[var(--color-admin-primary)] hover:underline" onClick={() => setPreview(p => !p)}>
                        {preview ? 'Hide preview' : 'Show preview'}
                      </button>
                    </div>
                    {preview ? (
                      <div className="prose prose-sm max-w-none rounded-md border border-[var(--color-admin-border)] bg-slate-50 p-4 text-sm">
                        <ReactMarkdown>{body}</ReactMarkdown>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{p.body_md || '_Empty_'}</ReactMarkdown>
                  </div>
                )}
              </CardBody>
              <CardFooter>
                {editingSlug === p.slug ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditingSlug(null)}>Cancel</Button>
                    <Button onClick={() => handleSave(p.slug)} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setEditingSlug(p.slug)}>Edit</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
