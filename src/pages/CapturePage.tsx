import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadQuiz, saveQuiz } from '../lib/quizStorage'
import { triggerVapiCall } from '../lib/vapiCall'

export default function CapturePage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) { setError('Please enter your first name'); return }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return }

    const answers = loadQuiz()
    answers.lead = {
      firstName: firstName.trim(),
      email: email.trim(),
      phone: phone.trim() || '',
    }
    saveQuiz(answers)

    if (answers.lead.phone) {
      const DELAY_MS = 15 * 60 * 1000
      console.log(`[VAPI] AI call scheduled in 15 minutes for ${answers.lead.phone}`)
      setTimeout(async () => {
        const result = await triggerVapiCall(answers)
        if (result.ok) console.log('[VAPI] Call triggered:', result.callId)
        else console.warn('[VAPI] Call failed:', result.error)
      }, DELAY_MS)
    }

    navigate('/results', { replace: true })
  }

  return (
    <div className="funnel-shell funnel-capture">
    <div className="cap-shell">
      <div className="cap-glow" />

      <main className="cap-main">
        <div className="cap-progress-bar">
          <div className="cap-progress-fill" />
        </div>
        <p className="cap-step-label">Step 3 of 3 — Almost done</p>

        <div className="cap-icon">🧬</div>
        <h1 className="cap-h1">Your #1 match is ready</h1>
        <p className="cap-sub">
          We&apos;ve scored your answers against our UK-verified catalogue. Enter your details
          to unlock your personalised results, protocol guide, and exclusive
          quiz-taker pricing.
        </p>

        <div className="cap-preview">
          <div className="cap-preview-blur">
            <div className="cap-preview-card">
              <span className="cap-preview-badge">YOUR #1 MATCH</span>
              <div className="cap-preview-placeholder" />
              <span className="cap-preview-line" />
              <span className="cap-preview-line cap-preview-line--short" />
            </div>
          </div>
          <span className="cap-preview-label">Your results are ready — unlock below</span>
        </div>

        <form className="cap-form" onSubmit={handleSubmit} noValidate>
          <div className="cap-field">
            <label className="cap-label" htmlFor="cap-name">First name</label>
            <input
              id="cap-name"
              className="cap-input"
              type="text"
              placeholder="e.g. James"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setError('') }}
              autoComplete="given-name"
              autoFocus
            />
          </div>
          <div className="cap-field">
            <label className="cap-label" htmlFor="cap-email">Email address</label>
            <input
              id="cap-email"
              className="cap-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              autoComplete="email"
            />
          </div>
          <div className="cap-field">
            <label className="cap-label" htmlFor="cap-phone">
              Phone number <span className="cap-optional">(optional)</span>
            </label>
            <input
              id="cap-phone"
              className="cap-input"
              type="tel"
              placeholder="+44 7XXX XXX XXX"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError('') }}
              autoComplete="tel"
            />
          </div>

          {error && <p className="cap-error">{error}</p>}

          <button type="submit" className="cap-btn">
            Unlock My Results →
          </button>

          <p className="cap-legal">
            🔒 We'll never spam you. Your data stays private.
            <br />By continuing you agree to receive your results and occasional updates from Peptiva.
          </p>
        </form>

        <div className="cap-social">
          <p className="cap-social-quote">
            "The quiz matched me perfectly. Arrived in 3 days and I saw changes within 2 weeks."
          </p>
          <span className="cap-social-name">— James T., Manchester</span>
        </div>

        <div className="cap-urgency">
          <span className="cap-urgency-dot" />
          <span>147 people completed this quiz today — limited stock on matched compounds</span>
        </div>
      </main>
    </div>
    </div>
  )
}
