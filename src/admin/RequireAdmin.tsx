import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../members/context/AuthContext'

interface Props {
  children: React.ReactNode
}

export function RequireAdmin({ children }: Props) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--color-admin-muted)]">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(pathname)}`} replace />
  }

  if (!user.isAdmin) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-xl border border-[var(--color-admin-border)] bg-[var(--color-admin-surface)] p-6 shadow-2xl">
          <h1 className="text-lg font-semibold text-[var(--color-admin-text-strong)]">Admin access required</h1>
          <p className="mt-2 text-sm text-[var(--color-admin-muted)]">
            Your account ({user.email}) does not have admin permissions. Ask another
            administrator to grant the <code className="rounded bg-[var(--color-admin-bg-soft)] px-1 py-0.5 text-xs text-[var(--color-admin-text)]">is_admin</code> flag on your user, or
            sign in with a different account.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
