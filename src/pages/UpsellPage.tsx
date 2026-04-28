import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { recommendPeptides } from '../lib/recommend'
import { loadQuiz } from '../lib/quizStorage'
import { defaultQuizAnswers } from '../types/quiz'

const PRICES: Record<string, { was: number; now: number }> = {
  '17': { was: 189, now: 129 },
  '2':  { was: 179, now: 119 },
  '3':  { was: 159, now: 99 },
  '18': { was: 149, now: 89 },
  '1':  { was: 139, now: 79 },
  '8':  { was: 129, now: 79 },
  '10': { was: 129, now: 79 },
  '20': { was: 169, now: 109 },
  '6':  { was: 199, now: 139 },
  '4':  { was: 119, now: 69 },
  '19': { was: 159, now: 99 },
  '7':  { was: 149, now: 89 },
}

function getPrice(id: string) {
  return PRICES[id] || { was: 149, now: 99 }
}

function UpsellCountdown() {
  const [left, setLeft] = useState(() => {
    const stored = sessionStorage.getItem('peptiva-upsell-timer')
    if (stored) {
      const diff = parseInt(stored, 10) - Date.now()
      return diff > 0 ? diff : 0
    }
    const end = Date.now() + 10 * 60 * 1000
    sessionStorage.setItem('peptiva-upsell-timer', String(end))
    return 10 * 60 * 1000
  })

  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => {
      const stored = sessionStorage.getItem('peptiva-upsell-timer')
      if (!stored) { setLeft(0); return }
      const diff = parseInt(stored, 10) - Date.now()
      setLeft(diff > 0 ? diff : 0)
    }, 1000)
    return () => clearInterval(t)
  }, [left])

  const mins = Math.floor(left / 60000)
  const secs = Math.floor((left % 60000) / 1000)

  return (
    <div className="up-timer">
      <span className="up-timer-icon">🔥</span>
      <span className="up-timer-text">ONE-TIME OFFER — This page will not be shown again</span>
      <span className="up-timer-clock">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  )
}

function ProgressBar() {
  return (
    <div className="up-progress">
      <div className="up-progress-inner">
        <div className="up-progress-step up-progress-step--done">
          <span className="up-progress-dot">✓</span>
          <span>Quiz</span>
        </div>
        <div className="up-progress-line up-progress-line--done" />
        <div className="up-progress-step up-progress-step--done">
          <span className="up-progress-dot">✓</span>
          <span>Results</span>
        </div>
        <div className="up-progress-line up-progress-line--active" />
        <div className="up-progress-step up-progress-step--active">
          <span className="up-progress-dot">3</span>
          <span>Special Offer</span>
        </div>
        <div className="up-progress-line" />
        <div className="up-progress-step">
          <span className="up-progress-dot">4</span>
          <span>Checkout</span>
        </div>
      </div>
    </div>
  )
}

export default function UpsellPage() {
  const navigate = useNavigate()
  const answers = useMemo(() => loadQuiz(), [])
  const valid = answers.goal && answers.researchAck
  const rec = useMemo(() => valid ? recommendPeptides(answers) : null, [answers, valid])
  const [declining, setDeclining] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!valid || !rec) {
    return (
      <div className="tsl-empty">
        <h1>Complete the quiz first</h1>
        <p>Your personalised results page is built from your answers.</p>
        <Link className="r-cta-btn" to="/">Take the Quiz →</Link>
      </div>
    )
  }

  const merged = { ...defaultQuizAnswers(), ...answers }
  const { primary } = rec
  const name = merged.lead?.firstName || 'there'
  const oneMonthPrice = getPrice(primary.id)

  const threeMonthRegular = oneMonthPrice.now * 3
  const threeMonthDiscount = Math.round(threeMonthRegular * 0.80)
  const totalSaved = threeMonthRegular - threeMonthDiscount
  const perMonth = Math.round(threeMonthDiscount / 3)
  const vsRetailTotal = oneMonthPrice.was * 3
  const totalVsRetailSaved = vsRetailTotal - threeMonthDiscount

  const handleAccept = () => {
    navigate('/checkout', {
      state: {
        items: [
          {
            sku: primary.sku,
            compound: primary.compound,
            image: primary.image,
            price: threeMonthDiscount,
            displayPrice: `£${threeMonthDiscount}`,
          },
        ],
        amount: threeMonthDiscount * 100,
        quantity: 3,
        description: `${primary.sku} — 3 Month Supply`,
        displayPrice: `£${threeMonthDiscount}`,
      },
    })
  }

  const handleDecline = () => {
    if (!declining) {
      setDeclining(true)
      return
    }
    navigate('/checkout', {
      state: {
        items: [
          {
            sku: primary.sku,
            compound: primary.compound,
            image: primary.image,
            price: oneMonthPrice.now,
            displayPrice: `£${oneMonthPrice.now}`,
          },
        ],
        amount: oneMonthPrice.now * 100,
        quantity: 1,
        description: `${primary.sku} — 1 Month Supply`,
        displayPrice: `£${oneMonthPrice.now}`,
      },
    })
  }

  return (
    <div className="up-page">
      <UpsellCountdown />
      <ProgressBar />

      {/* WAIT BANNER */}
      <section className="up-wait">
        <div className="up-wrap">
          <span className="up-wait-badge">⚡ WAIT — YOUR ORDER ISN'T COMPLETE YET</span>
          <h1 className="up-wait-h1">
            {name}, lock in <span className="up-hl">3 months</span> of {primary.sku} and save an extra 20%
          </h1>
          <p className="up-wait-sub">
            You already chose the right compound. Now choose the smart commitment.
            Most customers who see results at 30 days wish they'd ordered the 3-month supply from the start.
          </p>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="up-compare">
        <div className="up-wrap">
          <div className="up-compare-grid">
            {/* 1-month: what they already chose */}
            <div className="up-compare-card up-compare-card--basic">
              <div className="up-compare-tag">YOUR CURRENT ORDER</div>
              <h3>1-Month Supply</h3>
              <div className="up-compare-product">
                {primary.image && <img src={primary.image} alt={primary.sku} className="up-compare-img" />}
                <span className="up-compare-sku">{primary.sku}</span>
              </div>
              <div className="up-compare-price">
                <span className="up-compare-amount">£{oneMonthPrice.now}</span>
                <span className="up-compare-period">/month</span>
              </div>
              <ul className="up-compare-list">
                <li>1 vial of {primary.compound}</li>
                <li>30-day protocol</li>
                <li>Free UK shipping</li>
                <li className="up-compare-list--muted">Re-order at full price next month</li>
                <li className="up-compare-list--muted">Risk of supply gaps</li>
              </ul>
            </div>

            {/* 3-month: the upsell */}
            <div className="up-compare-card up-compare-card--best">
              <div className="up-compare-tag up-compare-tag--best">🏆 RECOMMENDED — BEST VALUE</div>
              <h3>3-Month Supply</h3>
              <div className="up-compare-product">
                {primary.image && (
                  <div className="up-compare-img-stack">
                    <img src={primary.image} alt={primary.sku} className="up-compare-img up-compare-img--1" />
                    <img src={primary.image} alt={primary.sku} className="up-compare-img up-compare-img--2" />
                    <img src={primary.image} alt={primary.sku} className="up-compare-img up-compare-img--3" />
                  </div>
                )}
                <span className="up-compare-sku">{primary.sku} × 3</span>
              </div>
              <div className="up-compare-price">
                <span className="up-compare-was">£{threeMonthRegular}</span>
                <span className="up-compare-amount up-compare-amount--best">£{threeMonthDiscount}</span>
              </div>
              <div className="up-compare-permonth">
                That's just <strong>£{perMonth}/month</strong>
              </div>
              <div className="up-compare-savings">
                <span>💰 You save £{totalSaved} vs ordering monthly</span>
                <span>💎 £{totalVsRetailSaved} off retail price</span>
              </div>
              <ul className="up-compare-list">
                <li className="up-compare-list--green">3 vials of {primary.compound}</li>
                <li className="up-compare-list--green">Full 90-day protocol</li>
                <li className="up-compare-list--green">Free priority UK shipping</li>
                <li className="up-compare-list--green">Price locked — no increases</li>
                <li className="up-compare-list--green">No supply gaps, no re-ordering</li>
                <li className="up-compare-list--green">Extended dosing guide included</li>
              </ul>
              <button type="button" className="up-cta-btn" onClick={handleAccept}>
                Yes — Upgrade to 3 Months for £{threeMonthDiscount} →
              </button>
              <p className="up-cta-trust">🔒 Secure checkout · Same batch quality · Ships together</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY 3 MONTHS */}
      <section className="up-why">
        <div className="up-wrap">
          <h2 className="up-section-title">Why 90 days is the protocol that works</h2>
          <p className="up-section-sub">
            Peptide research consistently shows that a full 90-day cycle delivers compounding results
            that a single month can't match.
          </p>
          <div className="up-why-grid">
            <div className="up-why-card">
              <div className="up-why-week">WEEKS 1–2</div>
              <div className="up-why-bar" style={{ width: '25%' }} />
              <h3>Initial Response</h3>
              <p>Your body begins to recognise the signalling molecules. Subtle shifts in energy and appetite.</p>
            </div>
            <div className="up-why-card">
              <div className="up-why-week">WEEKS 3–4</div>
              <div className="up-why-bar" style={{ width: '50%' }} />
              <h3>Visible Changes</h3>
              <p>Most users notice the first real differences — energy, body composition, recovery speed.</p>
            </div>
            <div className="up-why-card up-why-card--hl">
              <div className="up-why-week">WEEKS 5–8</div>
              <div className="up-why-bar" style={{ width: '80%' }} />
              <h3>Acceleration Phase</h3>
              <p>Compounding effects kick in. This is where one-month users have to stop and re-order.</p>
            </div>
            <div className="up-why-card up-why-card--hl">
              <div className="up-why-week">WEEKS 9–12</div>
              <div className="up-why-bar" style={{ width: '100%' }} />
              <h3>Full Protocol Results</h3>
              <p>Peak adaptation. 94% of 3-month users report results they describe as "life-changing."</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="up-proof">
        <div className="up-wrap">
          <h2 className="up-section-title">From customers who chose 3 months</h2>
          <div className="up-proof-grid">
            {[
              { text: "I almost just got one month. So glad I didn't. By month 2 the results were on another level. Would have been gutted if I'd stopped.", name: "Mark D.", loc: "Liverpool", stat: "3-month user" },
              { text: "Ordered 1 month first, then had to re-order and wait a week. The gap set me back. Do yourself a favour and get the 3-month.", name: "Laura K.", loc: "Brighton", stat: "Re-ordered → 3-month" },
              { text: "The savings alone made it a no-brainer. But honestly, the real value is not having to think about re-ordering every month.", name: "Ryan J.", loc: "Glasgow", stat: "3-month user" },
            ].map((r, i) => (
              <div key={i} className="up-proof-card">
                <div className="up-proof-stars">{'★★★★★'}</div>
                <p>"{r.text}"</p>
                <div className="up-proof-footer">
                  <span className="up-proof-name">{r.name} — {r.loc}</span>
                  <span className="up-proof-stat">{r.stat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MATH BREAKDOWN */}
      <section className="up-math">
        <div className="up-wrap">
          <div className="up-math-box">
            <h2>The numbers don't lie</h2>
            <div className="up-math-grid">
              <div className="up-math-item">
                <span className="up-math-label">Retail price (3 months)</span>
                <span className="up-math-value up-math-value--struck">£{vsRetailTotal}</span>
              </div>
              <div className="up-math-item">
                <span className="up-math-label">Quiz discount price (3 × £{oneMonthPrice.now})</span>
                <span className="up-math-value up-math-value--struck">£{threeMonthRegular}</span>
              </div>
              <div className="up-math-item up-math-item--final">
                <span className="up-math-label">Your price today — 3 months</span>
                <span className="up-math-value up-math-value--final">£{threeMonthDiscount}</span>
              </div>
              <div className="up-math-item up-math-item--save">
                <span className="up-math-label">Total saved vs retail</span>
                <span className="up-math-value up-math-value--save">£{totalVsRetailSaved}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="up-final">
        <div className="up-wrap">
          <h2>This price disappears when you leave this page.</h2>
          <p>The 20% 3-month discount is only available right now, right here. If you come back tomorrow, you'll pay full price — or it won't be available at all.</p>
          <button type="button" className="up-cta-btn up-cta-btn--lg" onClick={handleAccept}>
            Upgrade to 3 Months — £{threeMonthDiscount} →
          </button>
          <p className="up-final-trust">🔒 Secure checkout · Free priority shipping · Batch verified · Price locked</p>

          <div className="up-decline">
            {!declining ? (
              <button type="button" className="up-decline-btn" onClick={handleDecline}>
                No thanks, I'll stick with 1 month →
              </button>
            ) : (
              <div className="up-decline-confirm">
                <p>Are you sure? You're leaving <strong>£{totalSaved}</strong> on the table and will pay full price if you re-order next month.</p>
                <button type="button" className="up-decline-btn" onClick={handleDecline}>
                  Yes, I understand — continue with 1 month only →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="r-footer">
        <div className="r-wrap">
          <p>
            Peptiva Ltd. All products manufactured in our UK-regulated laboratory. Sold for research use only.
            Full documentation included with every order. Comply with UK law.
          </p>
          <p className="r-footer-copy">© {new Date().getFullYear()} Peptiva · <Link to="/">Home</Link> · <Link to="/">Retake Quiz</Link></p>
        </div>
      </footer>
    </div>
  )
}
