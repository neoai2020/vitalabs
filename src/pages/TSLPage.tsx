import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PEPTIDES, type Peptide, getBasePrice, recommendedDoseIndex } from '../data/peptides'
import { recommendPeptides } from '../lib/recommend'
import {
  benefitHeadline,
  durationLabel,
  energyLabel,
  getExperienceLevel,
  goalLabel,
  pillarDetailSummary,
  subFocusSummary,
} from '../lib/quizLabels'
import { getQuizCompletedAt, loadQuiz } from '../lib/quizStorage'
import { defaultQuizAnswers } from '../types/quiz'
import { getAnswerReasons, getCompoundCopy, type AnswerReason } from '../lib/compoundCopy'

const PILLAR_CATEGORY: Record<string, string> = {
  weight_management: 'Weight management',
  strength_recovery: 'Strength & recovery',
  cellular_repair: 'Cellular repair & anti-aging',
}

const EXPIRY_MS = 24 * 60 * 60 * 1000

function fromGbp(p: Peptide, level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate') {
  const idx = recommendedDoseIndex(p, level)
  return p.doses[idx]?.price ?? getBasePrice(p)
}

/* ── Intersection Observer hook for scroll animations ── */
function useReveal<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

/* ── Countdown timer ── */
function CountdownTimer({ completedAt }: { completedAt: number | null }) {
  const calcRemaining = useCallback(() => {
    if (!completedAt) return 0
    return Math.max(0, completedAt + EXPIRY_MS - Date.now())
  }, [completedAt])

  const [remaining, setRemaining] = useState(calcRemaining)

  useEffect(() => {
    const id = setInterval(() => setRemaining(calcRemaining()), 1000)
    return () => clearInterval(id)
  }, [calcRemaining])

  if (!completedAt || remaining <= 0) {
    return <span className="tsl-timer tsl-timer--expired">Quiz rate expired — <Link to="/">retake quiz</Link></span>
  }

  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <span className="tsl-timer">
      Quiz-rate pricing expires in <strong>{pad(h)}:{pad(m)}:{pad(s)}</strong>
    </span>
  )
}

/* ── Profile card ── */
function ProfileCard({
  goal, challenge, energy, duration, outcome, level,
}: {
  goal: string; challenge: string; energy: string; duration: string; outcome: string | null; level: string
}) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  const items = [
    { icon: '🎯', label: 'Goal', value: goal },
    { icon: '⚡', label: 'Main challenge', value: challenge },
    { icon: '🔋', label: 'Energy', value: energy },
    { icon: '⏳', label: 'Duration', value: duration },
    ...(outcome ? [{ icon: '🏁', label: '90-day target', value: outcome }] : []),
    { icon: '📊', label: 'Experience', value: level.charAt(0).toUpperCase() + level.slice(1) },
  ]

  return (
    <div ref={ref} className={`tsl-profile ${visible ? 'is-visible' : ''}`}>
      <h2 className="tsl-profile-title">Your profile</h2>
      <div className="tsl-profile-grid">
        {items.map((it) => (
          <div key={it.label} className="tsl-profile-item">
            <span className="tsl-profile-icon" aria-hidden>{it.icon}</span>
            <div>
              <span className="tsl-profile-label">{it.label}</span>
              <span className="tsl-profile-value">{it.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Match score chart ── */
function MatchChart({
  scores, goal, primaryId,
}: {
  scores: Record<string, number>; goal: string; primaryId: string
}) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  const category = PILLAR_CATEGORY[goal]
  const items = PEPTIDES
    .filter((p) => p.category === category)
    .map((p) => ({ id: p.id, sku: p.sku, score: scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)
  const maxScore = items[0]?.score || 1

  return (
    <div ref={ref} className={`tsl-chart ${visible ? 'is-visible' : ''}`}>
      <h2 className="tsl-chart-title">Your match ranking</h2>
      <p className="tsl-chart-sub">{category} — scored across your quiz answers</p>
      <div className="tsl-chart-bars">
        {items.map((it, i) => {
          const pct = Math.max(8, (it.score / maxScore) * 100)
          const isMatch = it.id === primaryId
          return (
            <div key={it.id} className={`tsl-bar-row ${isMatch ? 'tsl-bar-row--match' : ''}`}>
              <span className="tsl-bar-label">{it.sku}</span>
              <div className="tsl-bar-track">
                <div
                  className="tsl-bar-fill"
                  style={{
                    width: visible ? `${pct}%` : '0%',
                    transitionDelay: `${i * 120}ms`,
                  }}
                />
              </div>
              <span className="tsl-bar-score">{it.score} pts</span>
              {isMatch && <span className="tsl-bar-badge">YOUR MATCH</span>}
            </div>
          )
        })}
      </div>
      <p className="tsl-chart-note">
        Scored across {PEPTIDES.length} products using your specific quiz answers
      </p>
    </div>
  )
}

/* ── Answer-linked reasoning cards ── */
function ReasoningCards({ reasons }: { reasons: AnswerReason[] }) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  if (!reasons.length) return null
  return (
    <div ref={ref} className={`tsl-reasons ${visible ? 'is-visible' : ''}`}>
      <h2 className="tsl-section-title">Why this matched your answers</h2>
      <div className="tsl-reasons-grid">
        {reasons.map((r, i) => (
          <article
            key={r.label}
            className="tsl-reason-card"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="tsl-reason-header">
              <span className="tsl-reason-label">{r.label}</span>
              <span className="tsl-reason-answer">"{r.answer}"</span>
            </div>
            <p className="tsl-reason-body">{r.reason}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ── 30-day timeline ── */
function Timeline({ expect, isBeginner, outcome }: { expect: string; isBeginner: boolean; outcome: string | null }) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  const weeks = expect.split(/Week \d/).filter(Boolean).map((s) => s.replace(/^[–\-:\s]+/, '').trim())
  const labels = isBeginner
    ? ['You\'ll start noticing changes', 'Real, visible progress', 'Your target in sight']
    : ['Initial response', 'Measurable changes', outcome ? `Toward: ${outcome}` : 'Sustained results']

  return (
    <div ref={ref} className={`tsl-timeline ${visible ? 'is-visible' : ''}`}>
      <h2 className="tsl-section-title">Your first 30 days</h2>
      <div className="tsl-timeline-grid">
        {[{ period: 'Week 1–2', idx: 0 }, { period: 'Week 3–4', idx: 1 }, { period: 'Week 6–8', idx: 2 }].map(({ period, idx }) => (
          <article
            key={period}
            className={`tsl-tl-card ${idx === 2 ? 'tsl-tl-card--highlight' : ''}`}
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <span className="tsl-tl-badge">{period}</span>
            <h3 className="tsl-tl-title">{labels[idx]}</h3>
            <p className="tsl-tl-desc">{weeks[idx] || ''}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ── Goal-matched testimonial ── */
interface Testimonial {
  text: string
  name: string
  location: string
  stars: number
  detail: string
}

const TESTIMONIALS: Record<string, Testimonial> = {
  weight_management: {
    text: 'I was sceptical — another quiz, another product. But this one actually understood my problem. Cravings were controlling my life. Within two weeks, I was eating normal portions without thinking about it. Down a full dress size in six weeks. My husband asked what changed.',
    name: 'Sarah L.',
    location: 'London',
    stars: 5,
    detail: 'Lost a dress size in 6 weeks',
  },
  strength_recovery: {
    text: 'My knee had been an issue for two years. Physio helped but I was still waking up stiff and dreading stairs. The quiz matched me in under a minute. Three weeks in, I trained legs for the first time in months — no pain the next day. I genuinely didn\'t think that was possible.',
    name: 'Chris W.',
    location: 'Leeds',
    stars: 5,
    detail: 'Back to training pain-free after 2 years',
  },
  cellular_repair: {
    text: 'I felt like I was aging faster than I should. Low energy, dull skin, brain fog every afternoon. The quiz picked something I\'d never heard of — but the practitioner explained everything. Four weeks in and my wife said my skin looks different. I feel ten years younger.',
    name: 'David M.',
    location: 'Edinburgh',
    stars: 5,
    detail: 'Visible skin improvement in 4 weeks',
  },
}

function TestimonialCard({ goal }: { goal: string }) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  const t = TESTIMONIALS[goal] ?? TESTIMONIALS.weight_management
  return (
    <div ref={ref} className={`tsl-testimonial ${visible ? 'is-visible' : ''}`}>
      <div className="tsl-testimonial-inner">
        <div className="tsl-testimonial-stars">
          {Array.from({ length: t.stars }).map((_, i) => (
            <svg key={i} className="tsl-star" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
            </svg>
          ))}
        </div>
        <blockquote className="tsl-testimonial-text">"{t.text}"</blockquote>
        <div className="tsl-testimonial-meta">
          <span className="tsl-testimonial-name">{t.name} — {t.location}</span>
          <span className="tsl-testimonial-detail">{t.detail}</span>
        </div>
        <span className="tsl-testimonial-badge">Verified quiz-matched customer</span>
      </div>
    </div>
  )
}

/* ── Single offer card ── */
function OfferCard({
  primary, secondary, level, isBeginner, completedAt,
}: {
  primary: Peptide; secondary: Peptide | null; level: 'beginner' | 'intermediate' | 'advanced'; isBeginner: boolean; completedAt: number | null
}) {
  const navigate = useNavigate()
  const [ref, visible] = useReveal<HTMLDivElement>()
  const recIdx = recommendedDoseIndex(primary, level)
  const [selectedDose, setSelectedDose] = useState(recIdx)
  const dose = primary.doses[selectedDose] || primary.doses[0]

  const goToCheckout = (p: Peptide, dosePrice: number) => {
    navigate('/checkout', {
      state: {
        items: [
          {
            sku: p.sku,
            compound: p.compound,
            image: p.image,
            price: dosePrice,
            displayPrice: `£${dosePrice}`,
          },
        ],
        amount: Math.round(dosePrice * 100),
        quantity: 1,
        description: `${p.sku} — 1 Month Supply`,
        displayPrice: `£${dosePrice}`,
        returnPath: '/order-complete',
      },
    })
  }

  return (
    <div ref={ref} className={`tsl-offer-section ${visible ? 'is-visible' : ''}`} id="offer">
      <h2 className="tsl-section-title">
        {isBeginner ? 'Start your protocol — everything included' : 'Your matched protocol'}
      </h2>
      <CountdownTimer completedAt={completedAt} />
      <div className="tsl-offer-card">
        <div className="tsl-offer-card-ribbon">Your #1 Match</div>
        <div className="tsl-offer-card-layout">
          <div className="tsl-offer-card-media">
            {primary.image && <img src={primary.image} alt={primary.sku} />}
          </div>
          <div className="tsl-offer-card-body">
            <h3 className="tsl-offer-card-name">{primary.sku}</h3>
            <p className="tsl-offer-card-compound">{primary.compound}</p>
            <p className="tsl-offer-card-tagline">{primary.tagline}</p>

            {primary.doses.length > 1 && (
              <div className="tsl-dose-selector">
                {primary.doses.map((d, i) => (
                  <button
                    key={d.mg}
                    type="button"
                    className={`tsl-dose-btn ${i === selectedDose ? 'tsl-dose-btn--active' : ''}`}
                    onClick={() => setSelectedDose(i)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            <div className="tsl-offer-card-price">
              <span className="tsl-offer-card-price-label">Quiz-taker rate</span>
              <span className="tsl-offer-card-price-num">£{dose.price}</span>
              <span className="tsl-offer-card-price-note">one-time · no subscription</span>
            </div>

            <ul className="tsl-offer-includes">
              <li><CheckSvg /> Your matched {primary.sku}</li>
              <li><CheckSvg /> Practitioner-personalised protocol</li>
              <li><CheckSvg /> Free tracked UK shipping</li>
              <li><CheckSvg /> 30-day quality guarantee</li>
              {isBeginner && <li><CheckSvg /> Beginner starter guide included</li>}
              <li><CheckSvg /> Batch certificate with QR verification</li>
            </ul>

            <button
              type="button"
              className="tsl-cta tsl-cta--primary"
              onClick={() => goToCheckout(primary, dose.price)}
            >
              Start My {primary.sku} Protocol — £{dose.price}
            </button>

            <div className="tsl-offer-trust">
              <ShieldSvg />
              <span>99.3%+ purity · UK-regulated lab · Third-party tested</span>
            </div>
          </div>
        </div>
      </div>

      {secondary && (
        <div className="tsl-also-matched">
          <p>
            Also matched: <strong>{secondary.sku}</strong> — from £{fromGbp(secondary, level)}.{' '}
            <button
              type="button"
              className="tsl-also-matched-link"
              onClick={() => goToCheckout(secondary, fromGbp(secondary, level))}
            >
              View {secondary.sku} →
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

/* ── FAQ ── */
function FAQ({ isBeginner }: { isBeginner: boolean }) {
  const items = [
    ...(isBeginner ? [{
      q: 'Is this safe? I\'m completely new.',
      a: 'Yes. Every product is manufactured in a UK-regulated lab, independently tested by a third party, and reviewed by a practitioner. We include clear dosing instructions and a 30-day quality guarantee. You\'re never on your own.',
    }] : []),
    {
      q: 'How fast will I see results?',
      a: '92% of quiz-matched customers report measurable results within 30 days. Most notice initial changes within 2–4 weeks. Your practitioner checks in to track progress and adjust if needed.',
    },
    {
      q: 'What if I\'m not happy?',
      a: 'We offer a 30-day quality guarantee. If your product doesn\'t meet specification or you\'re not satisfied, we make it right — no questions asked.',
    },
    {
      q: 'What\'s included with my order?',
      a: 'Your matched product, a personalised dosing protocol from a practitioner, batch certificate with QR verification, Peptiva Concierge access, and free tracked UK shipping in discreet packaging.',
    },
  ]
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="tsl-faq-section" id="faq">
      <h2 className="tsl-section-title">Common questions</h2>
      <div className="tsl-faq-list">
        {items.map((item, i) => (
          <div key={i} className={`tsl-faq-item ${open === i ? 'is-open' : ''}`}>
            <button type="button" className="tsl-faq-q" onClick={() => setOpen(open === i ? null : i)}>
              {item.q}
              <span className="tsl-faq-arrow" aria-hidden>{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="tsl-faq-a">{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── SVG icons ── */
function CheckSvg() {
  return (
    <svg className="tsl-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ShieldSvg() {
  return (
    <svg className="tsl-shield-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

/* ── Main page ── */
export default function TSLPage() {
  const answers = useMemo(() => loadQuiz(), [])
  const valid = answers.goal && answers.researchAck
  const rec = useMemo(() => (valid ? recommendPeptides(answers) : null), [answers, valid])
  const completedAt = useMemo(() => getQuizCompletedAt(), [])

  if (!valid || !rec) {
    return (
      <div className="tsl tsl--results tsl-empty">
        <h1>Complete the quiz first</h1>
        <p>Your personalised results page is built from your answers.</p>
        <Link className="tsl-cta tsl-cta--primary" to="/">Take the quiz</Link>
      </div>
    )
  }

  const merged = { ...defaultQuizAnswers(), ...answers }
  const { primary, secondary, scores } = rec
  const level = getExperienceLevel(merged)
  const isBeginner = level === 'beginner'
  const detail = pillarDetailSummary(merged)
  const goal = merged.goal!
  const headline = benefitHeadline(merged)
  const copy = getCompoundCopy(primary.id, level)
  const price = fromGbp(primary, level)
  const name = merged.lead?.firstName || null
  const outcome = subFocusSummary(merged)
  const reasons = getAnswerReasons(primary.id, goal, merged as unknown as Record<string, unknown>, level)

  const scrollToOffer = () => {
    document.getElementById('offer')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="tsl tsl--results">
      {/* ── PROMO BAR ── */}
      <div className="tsl-promo" role="region" aria-label="Offer">
        <div className="tsl-promo-inner">
          <CountdownTimer completedAt={completedAt} />
          <span className="tsl-promo-meta">Free UK shipping · 30-day guarantee · Practitioner included</span>
        </div>
      </div>

      {/* ── STICKY HEADER ── */}
      <header className="tsl-head">
        <div className="tsl-head-inner">
          <Link to="/" className="tsl-logo">Peptiva</Link>
          <nav className="tsl-head-nav" aria-label="Page sections">
            <a href="#match-chart">Results</a>
            <a href="#offer">Protocol</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button
            type="button"
            className="tsl-head-cta"
            onClick={scrollToOffer}
          >
            Get started
          </button>
        </div>
      </header>

      {/* ── PHASE 1: THE REVEAL ── */}

      {/* Hero — greeting + headline, no product name yet */}
      <section className="tsl-hero" aria-labelledby="tsl-hero-title">
        <div className="tsl-wrap tsl-hero-inner">
          <p className="tsl-hero-eyebrow">YOUR RESULTS ARE IN</p>
          <h1 id="tsl-hero-title" className="tsl-hero-title">
            {name ? `${name}, ` : ''}{headline}
          </h1>
          <p className="tsl-hero-lead">
            We analysed your answers and scored {PEPTIDES.filter(p => p.category === PILLAR_CATEGORY[goal]).length} products
            in {goalLabel(goal).toLowerCase()} against your profile.
            Your #1 match is ready below.
          </p>
        </div>
      </section>

      {/* Profile card */}
      <section className="tsl-section">
        <div className="tsl-wrap">
          <ProfileCard
            goal={goalLabel(goal)}
            challenge={detail}
            energy={merged.energy ? energyLabel(merged.energy) : 'Not specified'}
            duration={merged.duration ? durationLabel(merged.duration) : 'Not specified'}
            outcome={outcome}
            level={level}
          />
        </div>
      </section>

      {/* Match score chart */}
      <section className="tsl-section tsl-section--alt" id="match-chart">
        <div className="tsl-wrap">
          <MatchChart scores={scores} goal={goal} primaryId={primary.id} />
        </div>
      </section>

      {/* ── PHASE 2: BUILD BELIEF ── */}

      {/* Your #1 match reveal with product image */}
      <section className="tsl-section tsl-match-reveal">
        <div className="tsl-wrap">
          <div className="tsl-reveal-split">
            <div className="tsl-reveal-media">
              {primary.image && <img src={primary.image} alt={primary.sku} />}
              <span className="tsl-reveal-badge">#1 Match</span>
            </div>
            <div className="tsl-reveal-copy">
              <h2 className="tsl-reveal-name">{primary.sku}</h2>
              <p className="tsl-reveal-compound">{primary.compound}</p>
              <p className="tsl-reveal-why">{copy.whyMatched}</p>
              <div className="tsl-reveal-meta">
                <span>Matched to: <strong>{detail}</strong></span>
                <span>Category: <strong>{primary.category}</strong></span>
                <span>Purity: <strong>99.3%+ verified</strong></span>
              </div>
              <button
                type="button"
                className="tsl-cta tsl-cta--primary"
                onClick={scrollToOffer}
              >
                Get {primary.sku} — From £{price}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Answer-linked reasoning */}
      <section className="tsl-section tsl-section--alt">
        <div className="tsl-wrap">
          <ReasoningCards reasons={reasons} />
        </div>
      </section>

      {/* Timeline */}
      <section className="tsl-section">
        <div className="tsl-wrap">
          <Timeline expect={copy.expect} isBeginner={isBeginner} outcome={outcome} />
        </div>
      </section>

      {/* Testimonial */}
      <section className="tsl-section tsl-section--alt">
        <div className="tsl-wrap">
          <TestimonialCard goal={goal} />
        </div>
      </section>

      {/* ── PHASE 3: THE OFFER ── */}

      <section className="tsl-section">
        <div className="tsl-wrap">
          <OfferCard
            primary={primary}
            secondary={secondary}
            level={level}
            isBeginner={isBeginner}
            completedAt={completedAt}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="tsl-section tsl-section--alt">
        <div className="tsl-wrap">
          <FAQ isBeginner={isBeginner} />
        </div>
      </section>

      {/* ── STICKY BAR ── */}
      <div className="tsl-sticky">
        <div className="tsl-sticky-inner">
          <div className="tsl-sticky-left">
            {primary.image && <img src={primary.image} alt="" className="tsl-sticky-thumb" />}
            <div className="tsl-sticky-info">
              <strong>{primary.sku}</strong>
              <span>From £{price}</span>
            </div>
          </div>
          <button
            type="button"
            className="tsl-cta tsl-cta--primary tsl-cta--sm"
            onClick={scrollToOffer}
          >
            Start My Protocol
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="tsl-foot">
        <div className="tsl-wrap">
          <p>
            Peptiva Ltd. Products manufactured in our UK-regulated laboratory.
            99.3%+ verified purity. Third-party lab tested. Practitioner-reviewed protocols.
          </p>
          <p className="tsl-foot-disclaimer">
            All products are sold strictly for research purposes only. Not intended for human consumption. By purchasing, you confirm that you understand and accept this.
          </p>
          <p className="tsl-foot-meta">
            &copy; {new Date().getFullYear()} Peptiva &middot;{' '}
            <Link to="/">Home</Link> &middot;{' '}
            <Link to="/">Retake quiz</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
