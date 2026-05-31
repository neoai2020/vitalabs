import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next')
  const [email, setEmail] = useState('alex@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setBusy(true)
    setError('')
    try {
      const ok = await login(email, password)
      if (ok) navigate(next || '/members')
      else setError('Invalid credentials')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="m-auth-page">
      <div className="m-auth-card">
        <div className="m-auth-brand">
          <span className="m-auth-logo">⬡</span>
          <h1>Welcome back</h1>
          <p>Sign in to your Vita Labs members area</p>
        </div>
        <form className="m-auth-form" onSubmit={handleSubmit}>
          {error && <div className="m-auth-error">{error}</div>}
          <label className="m-auth-label">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="m-auth-input"
            />
          </label>
          <label className="m-auth-label">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="m-auth-input"
            />
          </label>
          <button type="submit" className="m-auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign In →'}</button>
          <p className="m-auth-switch">
            Don't have an account? <Link to="/members/signup">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
