import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Button } from '../../components/ui/Button'
import { useBrandMutation } from '../../hooks/useBrandQuery'
import { supabase } from '../../../lib/supabase'
import { useAdminBrand } from '../../context/AdminBrandContext'

interface ProductRow {
  id: string
  sku: string
  compound: string
  category: string
  tagline: string
  description: string
  mechanism: string
  benefits: string[]
  ideal_for: string[]
  protocol: { week: string; description: string }[]
  image_url: string
  catalog_url: string
  tags: string[]
  doses: { label: string; mg: string; price: number }[]
  status: 'draft' | 'active' | 'archived'
  sort_order: number
}

const EMPTY: ProductRow = {
  id: '',
  sku: '',
  compound: '',
  category: '',
  tagline: '',
  description: '',
  mechanism: '',
  benefits: [],
  ideal_for: [],
  protocol: [],
  image_url: '',
  catalog_url: '',
  tags: [],
  doses: [{ label: '', mg: '', price: 0 }],
  status: 'active',
  sort_order: 100,
}

function joinList(arr: string[]): string { return arr.join('\n') }
function splitList(text: string): string[] { return text.split('\n').map(s => s.trim()).filter(Boolean) }

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const { brand } = useAdminBrand()
  const { upsert, remove } = useBrandMutation({ table: 'products' })
  const [row, setRow] = useState<ProductRow>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) { setRow({ ...EMPTY }); return }
    setLoading(true)
    supabase.from('products').select('*').eq('brand', brand).eq('id', id).maybeSingle()
      .then(({ data, error: dbErr }) => {
        if (dbErr) setError(dbErr.message)
        else if (data) setRow({ ...EMPTY, ...data })
        else setError(`Product ${id} not found for brand ${brand}`)
      })
      .then(() => setLoading(false))
  }, [id, brand, isNew])

  const setField = <K extends keyof ProductRow>(key: K, value: ProductRow[K]) => setRow(r => ({ ...r, [key]: value }))

  const handleSave = async () => {
    setError(null)
    try {
      await upsert.mutateAsync({ row: row as unknown as Record<string, unknown>, onConflict: 'brand,id' })
      navigate('/admin/content/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handleDelete = async () => {
    if (!row.id || isNew) return
    if (!confirm(`Delete product ${row.compound}? This is permanent.`)) return
    try {
      await remove.mutateAsync({ id: row.id })
      navigate('/admin/content/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) return <div className="text-sm text-[var(--color-admin-muted)]">Loading…</div>

  return (
    <>
      <PageHeader
        title={isNew ? 'New product' : `Edit ${row.compound || row.id}`}
        description="Pricing, copy, doses, and active status."
        actions={
          <Link to="/admin/content/products">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      {error ? <div className="mb-4 rounded-md border border-[var(--color-admin-danger)]/30 bg-[var(--color-admin-danger-soft)] px-4 py-3 text-sm text-[var(--color-admin-danger)]">{error}</div> : null}
      <div className="grid gap-4">
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Label hint="Stable string ID used in URLs. Cannot be changed once set.">
              ID
              <Input value={row.id} onChange={e => setField('id', e.target.value)} disabled={!isNew} />
            </Label>
            <Label>
              SKU
              <Input value={row.sku} onChange={e => setField('sku', e.target.value)} />
            </Label>
            <Label>
              Compound name
              <Input value={row.compound} onChange={e => setField('compound', e.target.value)} />
            </Label>
            <Label>
              Category
              <Input value={row.category} onChange={e => setField('category', e.target.value)} />
            </Label>
            <Label>
              Status
              <Select
                value={row.status}
                onChange={e => setField('status', e.target.value as ProductRow['status'])}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </Label>
            <Label>
              Sort order
              <Input type="number" value={row.sort_order} onChange={e => setField('sort_order', Number(e.target.value))} />
            </Label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Copy" />
          <CardBody className="grid gap-4">
            <Label>Tagline<Input value={row.tagline} onChange={e => setField('tagline', e.target.value)} /></Label>
            <Label>Description<Textarea rows={4} value={row.description} onChange={e => setField('description', e.target.value)} /></Label>
            <Label hint="Mechanism / how it works">Mechanism<Textarea rows={4} value={row.mechanism} onChange={e => setField('mechanism', e.target.value)} /></Label>
            <Label hint="One bullet per line">Benefits<Textarea rows={6} value={joinList(row.benefits)} onChange={e => setField('benefits', splitList(e.target.value))} /></Label>
            <Label hint="One bullet per line">Ideal for<Textarea rows={4} value={joinList(row.ideal_for)} onChange={e => setField('ideal_for', splitList(e.target.value))} /></Label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Doses" description="One row per available dose. JSON-edited for now; visual editor in a follow-up." />
          <CardBody>
            <Textarea
              rows={6}
              className="font-mono text-xs"
              value={JSON.stringify(row.doses, null, 2)}
              onChange={e => {
                try { setField('doses', JSON.parse(e.target.value)); setError(null) }
                catch { setError('doses: invalid JSON') }
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Protocol (what to expect)" description="Array of { week, description }." />
          <CardBody>
            <Textarea
              rows={6}
              className="font-mono text-xs"
              value={JSON.stringify(row.protocol, null, 2)}
              onChange={e => {
                try { setField('protocol', JSON.parse(e.target.value)); setError(null) }
                catch { setError('protocol: invalid JSON') }
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Media & links" />
          <CardBody className="grid gap-4">
            <Label>Image URL<Input value={row.image_url} onChange={e => setField('image_url', e.target.value)} /></Label>
            <Label>Catalog URL<Input value={row.catalog_url} onChange={e => setField('catalog_url', e.target.value)} /></Label>
            <Label hint="Comma-separated">Tags
              <Input
                value={row.tags.join(', ')}
                onChange={e => setField('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </Label>
          </CardBody>
          <CardFooter>
            <div className="flex flex-1 items-center justify-between gap-3">
              <div>
                {!isNew ? (
                  <Button variant="danger" onClick={handleDelete} disabled={remove.isPending}>
                    {remove.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                ) : null}
              </div>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : (isNew ? 'Create' : 'Save changes')}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
