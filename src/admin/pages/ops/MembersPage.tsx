import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody } from '../../components/ui/Card'

/**
 * Read-only members view. Supabase auth.users isn't exposed via the
 * standard REST API without elevated privileges; a real members list
 * needs a server-side function. Until that ships, point admins at
 * the Supabase dashboard.
 */
export default function MembersPage() {
  return (
    <>
      <PageHeader title="Members" description="Authenticated user accounts." />
      <Card>
        <CardBody>
          <p className="text-sm text-[var(--color-admin-muted)]">
            For now, manage member accounts in the Supabase dashboard under
            <strong className="px-1">Authentication → Users</strong>. A first-class
            members list (with admin-toggle, password reset, delete) lands in a follow-up
            phase that introduces a server-side Edge Function with elevated privileges.
          </p>
          <p className="mt-3 text-sm text-[var(--color-admin-muted)]">
            To grant admin to a user, run in the SQL editor:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs">
{`update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}', 'true'::jsonb)
where email = 'you@example.com';`}
          </pre>
        </CardBody>
      </Card>
    </>
  )
}
