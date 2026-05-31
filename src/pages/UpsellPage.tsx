import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { recommendPeptides } from '../lib/recommend'
import { loadQuiz } from '../lib/quizStorage'
import { defaultQuizAnswers } from '../types/quiz'
import { fetchActiveUpsellOffer, type UpsellOffer } from '../lib/marketing'
import { fillTokens, resolveTemplate } from '../lib/upsellTemplates'
import { PEPTIDES } from '../data/peptides'

function decodePreviewOffer(search: string): UpsellOffer | null {
  try {
    const params = new URLSearchParams(search)
    if (params.get('preview') !== '1') return null
    const raw = params.get('offer')
    if (!raw) return null
    const decoded = JSON.parse(atob(decodeURIComponent(raw)))
    return decoded as UpsellOffer
  } catch {
    return null
  }
}

const PRICES: Record<string, { was: number; now: number }> = {
  '17': { was: 189, now: 129 },
  '21': { was: 249, now: 199 },
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

function UpsellCountdown({ totalMs, isPreview = false }: { totalMs: number; isPreview?: boolean }) {
  const storageKey = isPreview ? null : 'vitalabs-upsell-timer'
  const [left, setLeft] = useState(() => {
    if (!storageKey) return totalMs
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const diff = parseInt(stored, 10) - Date.now()
      return diff > 0 ? diff : 0
    }
    const end = Date.now() + totalMs
    sessionStorage.setItem(storageKey, String(end))
    return totalMs
  })

  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => {
      if (!storageKey) {
        setLeft(prev => Math.max(0, prev - 1000))
        return
      }
      const stored = sessionStorage.getItem(storageKey)
      if (!stored) { setLeft(0); return }
      const diff = parseInt(stored, 10) - Date.now()
      setLeft(diff > 0 ? diff : 0)
    }, 1000)
    return () => clearInterval(t)
  }, [left, storageKey])

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
  const location = useLocation()
  const previewOffer = useMemo(() => decodePreviewOffer(location.search), [location.search])
  const isPreview = previewOffer !== null
  const answers = useMemo(() => loadQuiz(), [])
  const previewFallbackQuiz = isPreview && !answers.goal
  const valid = (answers.goal && answers.researchAck) || isPreview
  const rec = useMemo(() => {
    if (isPreview && previewFallbackQuiz) {
      return recommendPeptides({ ...defaultQuizAnswers(), goal: 'weight_management', researchAck: true })
    }
    return valid ? recommendPeptides(answers) : null
  }, [answers, valid, isPreview, previewFallbackQuiz])
  const [declining, setDeclining] = useState(false)
  const [offer, setOffer] = useState<UpsellOffer | null>(previewOffer)
  const [offerLoaded, setOfferLoaded] = useState(isPreview)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (isPreview) return
    void fetchActiveUpsellOffer().then(o => {
      setOffer(o)
      setOfferLoaded(true)
    })
  }, [isPreview])

  // Live preview re-reads the offer when the iframe URL changes.
  useEffect(() => {
    if (isPreview && previewOffer) setOffer(previewOffer)
  }, [isPreview, previewOffer])

  // No active offer for this brand? Skip the upsell entirely — the
  // customer flows straight to checkout. This is the "default" the
  // admin controls by leaving every template inactive.
  useEffect(() => {
    if (!offerLoaded || isPreview || offer) return
    navigate('/checkout', { replace: true })
  }, [offer, offerLoaded, isPreview, navigate])

  const template = useMemo(() => resolveTemplate(offer?.template), [offer?.template])

  // Resolve the add-on for stack_complement. Falls back to the first
  // catalogue item that isn't the primary if the admin didn't pick one.
  // NOTE: hooks must run unconditionally — keep this above the early
  // returns. `rec` can be null here; guarded inside.
  const addon = useMemo(() => {
    if (template.id !== 'stack_complement') return null
    if (!rec) return null
    const id = offer?.addon_product_id
    const found = id ? PEPTIDES.find(p => p.id === id) : null
    if (found && found.id !== rec.primary.id) return found
    return PEPTIDES.find(p => p.id !== rec.primary.id) ?? null
  }, [template.id, offer?.addon_product_id, rec])

  if (!valid || !rec) {
    return (
      <div className="tsl-empty">
        <h1>Complete the quiz first</h1>
        <p>Your personalised results page is built from your answers.</p>
        <Link className="r-cta-btn" to="/quiz">Take the Quiz →</Link>
      </div>
    )
  }

  // While we're checking for an active offer (and there's no preview),
  // render nothing — the redirect above will take over a tick later.
  if (!offerLoaded || (!offer && !isPreview)) {
    return null
  }

  const merged = { ...defaultQuizAnswers(), ...answers }
  const { primary } = rec
  const name = isPreview ? 'there' : (merged.lead?.firstName || 'there')
  const oneMonthPrice = getPrice(primary.id)

  const months = Math.max(1, offer?.months ?? template.months)
  const discountPct = offer?.discount_pct ?? template.defaultDiscountPct
  const discountMultiplier = Math.max(0, 1 - discountPct / 100)
  const timerMs = (offer?.timer_seconds ?? template.defaultTimerSeconds) * 1000

  const addonPrice = addon ? getPrice(addon.id) : null

  // Math: stack_complement = primary + addon at bundle discount.
  // Everything else = primary × months at discount.
  const isStack = template.id === 'stack_complement' && addon && addonPrice
  const regularTotal = isStack
    ? oneMonthPrice.now + addonPrice.now
    : oneMonthPrice.now * months
  const discountedTotal = Math.round(regularTotal * discountMultiplier)
  const totalSaved = regularTotal - discountedTotal
  const perMonth = isStack ? discountedTotal : Math.round(discountedTotal / months)
  const vsRetailTotal = isStack
    ? oneMonthPrice.was + (addonPrice?.was ?? 0)
    : oneMonthPrice.was * months
  const totalVsRetailSaved = vsRetailTotal - discountedTotal

  const tokenCtx = {
    name,
    sku: primary.sku,
    compound: primary.compound,
    months,
    discount: discountPct,
    price: discountedTotal,
  }

  const headline = offer?.headline?.trim()
    || fillTokens(template.headlineTemplate, tokenCtx)
  const subheadline = offer?.subheadline?.trim()
    || fillTokens(template.subheadlineTemplate, tokenCtx)
  const ctaLabel = offer?.cta?.trim()
    || fillTokens(template.ctaTemplate, tokenCtx)
  const finalNudge = fillTokens(template.finalNudge, tokenCtx)
  const primaryBullets = template.primaryBullets.map(b => fillTokens(b, tokenCtx))

  const handleAccept = () => {
    if (isPreview) return
    const items = isStack && addon && addonPrice ? [
      {
        sku: primary.sku,
        compound: primary.compound,
        image: primary.image,
        price: Math.round(oneMonthPrice.now * discountMultiplier),
        displayPrice: `£${Math.round(oneMonthPrice.now * discountMultiplier)}`,
      },
      {
        sku: addon.sku,
        compound: addon.compound,
        image: addon.image,
        price: Math.round(addonPrice.now * discountMultiplier),
        displayPrice: `£${Math.round(addonPrice.now * discountMultiplier)}`,
      },
    ] : [
      {
        sku: primary.sku,
        compound: primary.compound,
        image: primary.image,
        price: discountedTotal,
        displayPrice: `£${discountedTotal}`,
      },
    ]
    const description = isStack && addon
      ? `${primary.sku} + ${addon.sku} — Stack`
      : `${primary.sku} — ${months} Month Supply`
    navigate('/checkout', {
      state: {
        items,
        amount: discountedTotal * 100,
        quantity: isStack ? 2 : months,
        description,
        displayPrice: `£${discountedTotal}`,
        returnPath: '/order-complete',
      },
    })
  }

  const handleDecline = () => {
    if (!declining) {
      setDeclining(true)
      return
    }
    if (isPreview) return
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
        returnPath: '/order-complete',
      },
    })
  }

  return (
    <div className="up-page">
      {isPreview ? (
        <div style={{ background: '#1f1f25', color: '#fbbf24', textAlign: 'center', fontSize: 12, padding: '4px 12px', fontFamily: 'system-ui' }}>
          PREVIEW MODE — live updates as you edit the admin form
        </div>
      ) : null}
      <UpsellCountdown totalMs={timerMs} isPreview={isPreview} key={`${timerMs}-${isPreview}`} />
      <ProgressBar />

      {/* WAIT BANNER */}
      <section className="up-wait">
        <div className="up-wrap">
          <span className="up-wait-badge">⚡ WAIT — YOUR ORDER ISN'T COMPLETE YET</span>
          <h1 className="up-wait-h1">{headline}</h1>
          <p className="up-wait-sub">{subheadline}</p>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="up-compare">
        <div className="up-wrap">
          <div className="up-compare-grid">
            {/* Baseline: what they already chose */}
            <div className="up-compare-card up-compare-card--basic">
              <div className="up-compare-tag">YOUR CURRENT ORDER</div>
              <h3>{template.baselineTitle}</h3>
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

            {/* Upsell plan card */}
            <div className="up-compare-card up-compare-card--best">
              <div className="up-compare-tag up-compare-tag--best">{template.primaryTag}</div>
              <h3>{template.primaryTitle}</h3>
              <div className="up-compare-product">
                {isStack && addon ? (
                  <>
                    {primary.image && <img src={primary.image} alt={primary.sku} className="up-compare-img up-compare-img--1" />}
                    {addon.image && <img src={addon.image} alt={addon.sku} className="up-compare-img up-compare-img--2" />}
                    <span className="up-compare-sku">{primary.sku} + {addon.sku}</span>
                  </>
                ) : primary.image ? (
                  <>
                    <div className="up-compare-img-stack">
                      {Array.from({ length: Math.min(months, 4) }).map((_, i) => (
                        <img
                          key={i}
                          src={primary.image!}
                          alt={primary.sku}
                          className={`up-compare-img up-compare-img--${i + 1}`}
                        />
                      ))}
                    </div>
                    <span className="up-compare-sku">{primary.sku} × {months}</span>
                  </>
                ) : (
                  <span className="up-compare-sku">{primary.sku} × {months}</span>
                )}
              </div>
              <div className="up-compare-price">
                <span className="up-compare-was">£{regularTotal}</span>
                <span className="up-compare-amount up-compare-amount--best">£{discountedTotal}</span>
              </div>
              <div className="up-compare-permonth">
                {isStack
                  ? <>That's just <strong>£{discountedTotal}</strong> for the pair</>
                  : <>That's just <strong>£{perMonth}/month</strong></>}
              </div>
              <div className="up-compare-savings">
                <span>💰 You save £{totalSaved} {isStack ? 'vs buying separately' : 'vs ordering monthly'}</span>
                <span>💎 £{totalVsRetailSaved} off retail price</span>
              </div>
              <ul className="up-compare-list">
                {primaryBullets.map((b, i) => (
                  <li key={i} className="up-compare-list--green">{b}</li>
                ))}
              </ul>
              <button type="button" className="up-cta-btn" onClick={handleAccept}>
                {ctaLabel}
              </button>
              <p className="up-cta-trust">🔒 Secure checkout · Same batch quality · Ships together</p>
            </div>
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
                <span className="up-math-label">Retail price{isStack ? ' (pair)' : ` (${months} months)`}</span>
                <span className="up-math-value up-math-value--struck">£{vsRetailTotal}</span>
              </div>
              <div className="up-math-item">
                <span className="up-math-label">
                  {isStack
                    ? `Quiz discount price (${primary.sku} + ${addon?.sku})`
                    : `Quiz discount price (${months} × £${oneMonthPrice.now})`}
                </span>
                <span className="up-math-value up-math-value--struck">£{regularTotal}</span>
              </div>
              <div className="up-math-item up-math-item--final">
                <span className="up-math-label">Your price today{isStack ? '' : ` — ${months} months`}</span>
                <span className="up-math-value up-math-value--final">£{discountedTotal}</span>
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
          <p>{finalNudge}</p>
          <button type="button" className="up-cta-btn up-cta-btn--lg" onClick={handleAccept}>
            {ctaLabel}
          </button>
          <p className="up-final-trust">🔒 Secure checkout · Free priority shipping · Batch verified · Price locked</p>

          <div className="up-decline">
            {!declining ? (
              <button type="button" className="up-decline-btn" onClick={handleDecline}>
                No thanks, I'll stick with my 1-month order →
              </button>
            ) : (
              <div className="up-decline-confirm">
                <p>Are you sure? You're leaving <strong>£{totalSaved}</strong> on the table and will pay full price if you re-order later.</p>
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
            Vita Labs Ltd. All products manufactured in our UK-regulated laboratory. Sold for research use only.
            Full documentation included with every order. Comply with UK law.
          </p>
          <p className="r-footer-copy">© {new Date().getFullYear()} Vita Labs · <Link to="/">Home</Link> · <Link to="/quiz">Retake Quiz</Link></p>
        </div>
      </footer>
    </div>
  )
}
