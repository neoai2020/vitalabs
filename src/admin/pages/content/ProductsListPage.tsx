import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { StatusPill, type StatusTone } from '../../components/ui/StatusPill'
import { useBrandList } from '../../hooks/useBrandQuery'

const PRODUCT_STATUS_TONE: Record<ProductRow['status'], StatusTone> = {
  active:   'success',
  draft:    'warning',
  archived: 'neutral',
}

interface ProductRow {
  id: string
  sku: string | null
  compound: string
  category: string | null
  status: 'draft' | 'active' | 'archived'
  sort_order: number
}

export default function ProductsListPage() {
  const { data: products = [], isLoading, error } = useBrandList<ProductRow>({
    table: 'products',
    select: 'id, sku, compound, category, status, sort_order',
    orderBy: { column: 'sort_order', ascending: true },
  })

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage the catalogue. Edit pricing, copy, doses, and active status."
        actions={
          <Link to="/admin/content/products/new">
            <Button>New product</Button>
          </Link>
        }
      />
      <Card>
        {error ? (
          <div className="px-6 py-4 text-sm text-[var(--color-admin-danger)]">
            {error instanceof Error ? error.message : 'Failed to load products'}
          </div>
        ) : null}
        {isLoading ? (
          <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">Loading…</div>
        ) : products.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13.5px] text-[var(--color-admin-muted)]">
            <div className="mx-auto max-w-sm">
              No products yet. Create your first one to start filling the catalogue.
            </div>
            <div className="mt-4">
              <Link to="/admin/content/products/new"><Button size="sm">New product</Button></Link>
            </div>
          </div>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>ID</Th>
                <Th>Compound</Th>
                <Th>SKU</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Edit</Th>
              </Tr>
            </THead>
            <TBody>
              {products.map(p => (
                <Tr key={p.id}>
                  <Td className="font-mono text-xs">{p.id}</Td>
                  <Td className="font-medium">{p.compound}</Td>
                  <Td>{p.sku}</Td>
                  <Td>{p.category}</Td>
                  <Td><StatusPill tone={PRODUCT_STATUS_TONE[p.status]}>{p.status}</StatusPill></Td>
                  <Td className="text-right">
                    <Link
                      to={`/admin/content/products/${p.id}`}
                      className="text-[13px] font-medium text-[var(--color-admin-text-strong)] underline-offset-2 hover:text-[var(--color-admin-primary)] hover:underline"
                    >
                      Edit
                    </Link>
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
