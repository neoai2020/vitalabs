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
    return <Navigate to={`/members/login?next=${encodeURIComponent(pathname)}`} replace />
  }

  if (!user.isAdmin) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-lg border border-[var(--color-admin-border)] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-[var(--color-admin-muted)]">
            Your account ({user.email}) does not have admin permissions. Ask another
            administrator to grant the <code>is_admin</code> flag on your user, or
            sign in with a different account.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
