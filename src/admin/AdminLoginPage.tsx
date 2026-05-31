import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../members/context/AuthContext'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Label } from './components/ui/Label'
import './admin.css'

export default function AdminLoginPage() {
  const { user, loading, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const params = new URLSearchParams(location.search)
  const next = params.get('next') || '/admin'

  useEffect(() => {
    if (!loading && user?.isAdmin) {
      navigate(next, { replace: true })
    }
  }, [user, loading, next, navigate])

  if (loading) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--color-admin-muted)]">Loading…</p>
      </div>
    )
  }

  if (user && !user.isAdmin) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-lg border border-[var(--color-admin-border)] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[var(--color-admin-text)]">Not an admin account</h1>
          <p className="mt-2 text-sm text-[var(--color-admin-muted)]">
            You are signed in as <strong>{user.email}</strong>, but this account does
            not have admin permissions.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => { void logout() }}
          >
            Sign out and try another account
          </Button>
        </div>
      </div>
    )
  }

  if (user?.isAdmin) {
    return <Navigate to={next} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }
    setBusy(true)
    setError('')
    try {
      const ok = await login(email, password)
      if (!ok) setError('Invalid email or password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-root flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-[var(--color-admin-border)] bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-admin-muted)]">Admin</div>
          <h1 className="mt-1 text-xl font-semibold text-[var(--color-admin-text)]">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--color-admin-muted)]">
            Use your Supabase account with the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">is_admin</code> flag.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Label>
            Email
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Label>
          <Label>
            Password
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
