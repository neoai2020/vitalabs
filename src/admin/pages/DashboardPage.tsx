import { PageHeader } from '../components/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useAdminBrand } from '../context/AdminBrandContext'
import { BRAND_LABELS } from '../../lib/config/brand'

export default function DashboardPage() {
  const { brand } = useAdminBrand()
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Managing ${BRAND_LABELS[brand]}. Use the navigation on the left to edit site config, content, operations, and marketing.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Site config" description="Pixels, brand, WhatsApp, SEO" />
          <CardBody>
            <p className="text-sm text-[var(--color-admin-muted)]">Update tracking pixels and brand settings without redeploying code.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Content & catalogue" description="Products, reviews, FAQs" />
          <CardBody>
            <p className="text-sm text-[var(--color-admin-muted)]">Edit the product catalogue, testimonials, and on-site copy.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Operations" description="Orders, leads, members" />
          <CardBody>
            <p className="text-sm text-[var(--color-admin-muted)]">Review orders, customer signups, and lead submissions.</p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
