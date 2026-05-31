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
        <div className="admin-card max-w-md p-6">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-admin-text-strong)]">
            Admin access required
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-admin-muted)]">
            Your account ({user.email}) doesn’t have access to this workspace. Ask another admin to invite you, or sign in with a different account.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
