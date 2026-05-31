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
        <p className="text-[13px] text-[var(--color-admin-muted)]">Loading…</p>
      </div>
    )
  }

  if (user && !user.isAdmin) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center px-6">
        <div className="admin-card w-full max-w-md p-6">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-admin-text-strong)]">
            This account isn’t an admin
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-admin-muted)]">
            You’re signed in as <strong className="text-[var(--color-admin-text)]">{user.email}</strong>, which doesn’t have access to this workspace.
            Sign out and use an admin account to continue.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-5"
            onClick={() => { void logout() }}
          >
            Sign out
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
      <div className="admin-card w-full max-w-sm p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="admin-brand-badge mb-4 h-9 w-9 text-[12px]">VL</div>
          <div className="admin-eyebrow">Vitalabs · Admin</div>
          <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.015em] text-[var(--color-admin-text-strong)]">
            Sign in
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-admin-muted)]">
            Welcome back. Sign in with your admin account.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-[var(--color-admin-danger)]/30 bg-[var(--color-admin-danger-soft)] px-3 py-2 text-[13px] text-[var(--color-admin-danger)]">
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
              placeholder="you@vitalabs.com"
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
