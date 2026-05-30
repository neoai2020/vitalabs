import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields')
      return
    }
    const ok = signup(firstName, lastName, email, password)
    if (ok) navigate('/members')
    else setError('Something went wrong')
  }

  return (
    <div className="m-auth-page">
      <div className="m-auth-card">
        <div className="m-auth-brand">
          <span className="m-auth-logo">⬡</span>
          <h1>Create your account</h1>
          <p>Join the Vita Labs members area</p>
        </div>
        <form className="m-auth-form" onSubmit={handleSubmit}>
          {error && <div className="m-auth-error">{error}</div>}
          <div className="m-auth-row">
            <label className="m-auth-label">
              <span>First name</span>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Alex" className="m-auth-input" />
            </label>
            <label className="m-auth-label">
              <span>Last name</span>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Morgan" className="m-auth-input" />
            </label>
          </div>
          <label className="m-auth-label">
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="m-auth-input" />
          </label>
          <label className="m-auth-label">
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="m-auth-input" />
          </label>
          <button type="submit" className="m-auth-submit">Create Account →</button>
          <p className="m-auth-switch">
            Already have an account? <Link to="/members/login">Sign in</Link>
          </p>
        </form>
        <p className="m-auth-note">Testing mode: no email verification required</p>
      </div>
    </div>
  )
}
