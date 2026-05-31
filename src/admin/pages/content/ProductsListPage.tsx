import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/ui/Card'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { useBrandList } from '../../hooks/useBrandQuery'

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
          <div className="px-6 py-8 text-sm text-[var(--color-admin-muted)]">
            No products yet. Run <code>npx tsx scripts/seed-from-data-files.ts</code> to seed
            from <code>src/data/peptides.ts</code>, or create one with the New product button.
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
                  <Td>
                    <span className={
                      p.status === 'active'
                        ? 'rounded-full bg-[var(--color-admin-success-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-admin-success)]'
                        : p.status === 'draft'
                        ? 'rounded-full bg-[var(--color-admin-warning-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-admin-warning)]'
                        : 'rounded-full bg-[var(--color-admin-surface-elevated)] px-2 py-0.5 text-xs font-medium text-[var(--color-admin-muted)]'
                    }>{p.status}</span>
                  </Td>
                  <Td className="text-right">
                    <Link to={`/admin/content/products/${p.id}`} className="text-sm font-medium text-[var(--color-admin-primary)] hover:underline">
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
