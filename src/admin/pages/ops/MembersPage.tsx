import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody } from '../../components/ui/Card'

/**
 * Read-only members view. A first-class members table (with admin toggle,
 * password reset, delete) needs a server-side edge function with elevated
 * privileges — that ships in a follow-up phase. Until then, point admins
 * to the right place.
 */
export default function MembersPage() {
  return (
    <>
      <PageHeader
        title="Members"
        description="Customer accounts. A full members table with role management lands in a follow-up."
      />
      <Card>
        <CardBody>
          <p className="text-[13.5px] leading-relaxed text-[var(--color-admin-muted)]">
            Member accounts are stored alongside customer sessions. Until the dedicated members table
            lands, manage individual accounts in your auth provider dashboard under{' '}
            <span className="text-[var(--color-admin-text-strong)]">Authentication → Users</span>.
          </p>
          <p className="mt-3 text-[13.5px] text-[var(--color-admin-muted)]">
            To promote a user to admin, set the <span className="admin-mono text-[12.5px] text-[var(--color-admin-text-strong)]">is_admin</span> claim on their account.
          </p>
        </CardBody>
      </Card>
    </>
  )
}
