import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Button } from '../../components/ui/Button'
import { useBrandList, useBrandMutation } from '../../hooks/useBrandQuery'

interface BlockRow {
  brand: string
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export default function ContentBlocksPage() {
  const { data: blocks = [], isLoading } = useBrandList<BlockRow>({
    table: 'content_blocks',
    orderBy: { column: 'key', ascending: true },
  })
  const { upsert, remove } = useBrandMutation({ table: 'content_blocks' })

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editJson, setEditJson] = useState('{}')
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editingKey) return
    const block = blocks.find(b => b.key === editingKey)
    if (block) setEditJson(JSON.stringify(block.value, null, 2))
  }, [editingKey, blocks])

  const handleSave = async (key: string) => {
    setError(null)
    try {
      const value = JSON.parse(editJson)
      await upsert.mutateAsync({ row: { key, value }, onConflict: 'brand,key' })
      setEditingKey(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Invalid JSON or save failed') }
  }

  const handleCreate = async () => {
    setError(null)
    if (!newKey) { setError('Key is required'); return }
    try {
      await upsert.mutateAsync({ row: { key: newKey, value: {} }, onConflict: 'brand,key' })
      setNewKey('')
      setEditingKey(newKey)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <>
      <PageHeader title="Copy blocks" description="Free-form JSONB content fragments used across the site (hero copy, footer blurbs, etc.)." />

      <Card className="mb-4">
        <CardHeader title="Add block" description="Use snake_case keys like 'landing_hero' or 'results_guarantee'." />
        <CardBody>
          <div className="flex gap-2">
            <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="block_key" />
            <Button onClick={handleCreate} disabled={upsert.isPending || !newKey}>Add</Button>
          </div>
        </CardBody>
      </Card>

      {error ? <div className="mb-4 rounded-md border border-[var(--color-admin-danger)]/30 bg-[var(--color-admin-danger-soft)] px-4 py-3 text-sm text-[var(--color-admin-danger)]">{error}</div> : null}

      {isLoading ? (
        <Card><CardBody className="text-sm text-[var(--color-admin-muted)]">Loading…</CardBody></Card>
      ) : (
        <div className="grid gap-4">
          {blocks.map(block => (
            <Card key={block.key}>
              <CardHeader
                title={<span className="font-mono text-sm">{block.key}</span>}
                description={`Updated ${new Date(block.updated_at).toLocaleString()}`}
              />
              <CardBody>
                {editingKey === block.key ? (
                  <Label>JSON value
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      value={editJson}
                      onChange={e => setEditJson(e.target.value)}
                    />
                  </Label>
                ) : (
                  <pre className="overflow-x-auto rounded-md border border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] p-3 text-xs text-[var(--color-admin-text)]">{JSON.stringify(block.value, null, 2)}</pre>
                )}
              </CardBody>
              <CardFooter>
                <button
                  className="text-sm text-[var(--color-admin-danger)] hover:underline"
                  onClick={() => { if (confirm(`Delete block '${block.key}'?`)) void remove.mutate({ id: block.key, matchKey: 'key' }) }}
                >Delete</button>
                <div className="flex-1" />
                {editingKey === block.key ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditingKey(null)}>Cancel</Button>
                    <Button onClick={() => handleSave(block.key)} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setEditingKey(block.key)}>Edit</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
