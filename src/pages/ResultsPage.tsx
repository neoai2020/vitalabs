import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PEPTIDES, type Peptide, recommendedDoseIndex } from '../data/peptides'
import { recommendPeptides, getStackRecommendations, type StackSuggestion } from '../lib/recommend'
import { benefitHeadline, benefitSubline, durationLabel, energyLabel, getExperienceLevel, goalLabel, pillarDetailSummary, subFocusSummary } from '../lib/quizLabels'
import { loadQuiz } from '../lib/quizStorage'
import { defaultQuizAnswers } from '../types/quiz'
import { getCompoundCopy } from '../lib/compoundCopy'

const PILLAR_CATEGORY: Record<string, string> = {
  weight_management: 'Weight management',
  strength_recovery: 'Strength & recovery',
  cellular_repair: 'Cellular repair & anti-aging',
}

/* ── Animated counter hook ── */
function useCountUp(target: number, active: boolean, durationMs = 1200): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(ease * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, durationMs])
  return val
}

function ProfileCard({
  goal, challenge, energy, duration, outcome, level,
}: {
  goal: string; challenge: string; energy: string; duration: string; outcome: string | null; level: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const items = [
    { icon: '🎯', label: 'Goal', value: goal },
    { icon: '⚡', label: 'Challenge', value: challenge },
    { icon: '🔋', label: 'Energy', value: energy },
    { icon: '⏳', label: 'Duration', value: duration },
    ...(outcome ? [{ icon: '🏁', label: '90-day target', value: outcome }] : []),
    { icon: '📊', label: 'Experience', value: level.charAt(0).toUpperCase() + level.slice(1) },
  ]
  return (
    <div ref={ref} className={`rp-profile ${visible ? 'rp-profile--in' : ''}`}>
      <div className="rp-profile-head">
        <span className="rp-profile-dot" />
        <h2 className="rp-profile-title">Your Quiz Profile</h2>
      </div>
      <div className="rp-profile-grid">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={`rp-profile-item ${visible ? 'rp-profile-item--in' : ''}`}
            style={{ transitionDelay: `${i * 90}ms` }}
          >
            <div className="rp-profile-item-icon" aria-hidden>{it.icon}</div>
            <div className="rp-profile-item-body">
              <span className="rp-profile-label">{it.label}</span>
              <span className="rp-profile-value">{it.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchChart({
  scores, goal, primaryId, matchName,
}: {
  scores: Record<string, number>; goal: string; primaryId: string; matchName: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const category = PILLAR_CATEGORY[goal]
  const items = PEPTIDES
    .filter((p) => p.category === category)
    .map((p) => ({ id: p.id, sku: p.sku, score: scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)
  const maxScore = items[0]?.score || 1
  const topScore = items[0]?.score ?? 0
  const animatedTop = useCountUp(topScore, visible)
  const total = items.reduce((s, it) => s + it.score, 0)
  const matchPct = total > 0 ? Math.round((topScore / total) * 100) : 0
  const animatedPct = useCountUp(matchPct, visible)

  return (
    <div ref={ref} className={`rp-chart ${visible ? 'rp-chart--in' : ''}`}>
      <div className="rp-chart-header">
        <h2 className="rp-chart-title">Your match ranking</h2>
        <p className="rp-chart-sub">{category}</p>
      </div>

      <div className="rp-chart-stats">
        <div className="rp-stat">
          <span className="rp-stat-num">{animatedTop}</span>
          <span className="rp-stat-label">Match points</span>
        </div>
        <div className="rp-stat rp-stat--accent">
          <span className="rp-stat-num">{animatedPct}%</span>
          <span className="rp-stat-label">Match strength</span>
        </div>
        <div className="rp-stat">
          <span className="rp-stat-num">{items.length}</span>
          <span className="rp-stat-label">Products scored</span>
        </div>
      </div>

      <div className="rp-chart-bars">
        {items.map((it, i) => {
          const pct = Math.max(6, (it.score / maxScore) * 100)
          const isMatch = it.id === primaryId
          return (
            <div key={it.id} className={`rp-bar ${isMatch ? 'rp-bar--match' : ''}`}>
              <div className="rp-bar-meta">
                <span className="rp-bar-name">{it.sku}</span>
                {isMatch && <span className="rp-bar-badge">#1 MATCH</span>}
                <span className="rp-bar-pts">{it.score} pts</span>
              </div>
              <div className="rp-bar-track">
                <div
                  className="rp-bar-fill"
                  style={{
                    width: visible ? `${pct}%` : '0%',
                    transitionDelay: `${i * 150 + 300}ms`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="rp-chart-foot">
        Scored across {PEPTIDES.length} products · <strong>{matchName}</strong> is your strongest match
      </p>
    </div>
  )
}

function getPrice(peptide: Peptide, level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate') {
  const idx = recommendedDoseIndex(peptide, level)
  const dose = peptide.doses[idx] || peptide.doses[0]
  return { now: dose.price, label: dose.label }
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`fp-faq-item ${open ? 'fp-faq-item--open' : ''}`}>
      <button type="button" className="fp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <svg className="fp-faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && <div className="fp-faq-a">{a}</div>}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="fp-check" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  )
}

function StarIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
}

function Stars({ count = 5 }: { count?: number }) {
  return <span className="fp-stars">{Array.from({ length: count }).map((_, i) => <StarIcon key={i} />)}</span>
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  )
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const answers = useMemo(() => loadQuiz(), [])
  const valid = answers.goal && answers.researchAck
  const rec = useMemo(() => valid ? recommendPeptides(answers) : null, [answers, valid])

  if (!valid || !rec) {
    return (
      <div className="fp-empty">
        <h1>Complete the quiz first</h1>
        <p>Your personalised results page is built from your answers.</p>
        <Link className="fp-btn" to="/">Take the Quiz</Link>
      </div>
    )
  }

  const merged = { ...defaultQuizAnswers(), ...answers }
  const { primary, scores } = rec
  const level = getExperienceLevel(merged)
  const isBeginner = level === 'beginner'
  const detail = pillarDetailSummary(merged)
  const name = merged.lead?.firstName || 'there'
  const primaryPrice = getPrice(primary, level)
  const copy = getCompoundCopy(primary.id, level)
  const stacks = useMemo(() => getStackRecommendations(primary, level), [primary, level])
  const [checkedStacks, setCheckedStacks] = useState<Set<string>>(() =>
    new Set(stacks.map((s) => s.peptide.id)),
  )
  const toggleStack = (id: string) => {
    setCheckedStacks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const stackTotal = stacks
    .filter((s) => checkedStacks.has(s.peptide.id))
    .reduce((sum, s) => sum + s.discountedPrice, 0)

  const goToCheckout = () => {
    const total = primaryPrice.now + stackTotal
    const activeStacks = stacks.filter((s) => checkedStacks.has(s.peptide.id))
    const items = [
      {
        sku: primary.sku,
        compound: primary.compound,
        image: primary.image,
        price: primaryPrice.now,
        displayPrice: `£${primaryPrice.now}`,
      },
      ...activeStacks.map((s) => ({
        sku: s.peptide.sku,
        compound: s.peptide.compound,
        image: s.peptide.image,
        price: s.discountedPrice,
        displayPrice: `£${s.discountedPrice.toFixed(2)}`,
      })),
    ]
    navigate('/checkout', {
      state: {
        items,
        amount: Math.round(total * 100),
        quantity: items.length,
        description: items.length > 1 ? `${primary.sku} + Stack (${items.length} items)` : `${primary.sku} — 1 Month Supply`,
        displayPrice: `£${total.toFixed(2)}`,
      },
    })
  }

  const headline = benefitHeadline(merged)
  const subline = benefitSubline(merged, primary.sku, primaryPrice.now)

  return (
    <div className="fp">
      {/* ── PROMO BAR ── */}
      <div className="fp-promo">
        <span className="fp-promo-inner">
          🔥 <strong>QUIZ-TAKER EXCLUSIVE:</strong> Your personalised match + practitioner support + free UK shipping — locked in now.
        </span>
      </div>

      {/* ── HEADER ── */}
      <header className="fp-header">
        <div className="fp-container fp-header-inner">
          <Link to="/" className="fp-logo">Peptiva</Link>
          <nav className="fp-nav">
            <a href="#plans">Plans</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button type="button" className="fp-header-cta" onClick={goToCheckout}>Claim My Match</button>
        </div>
      </header>

      {/* ── YOUR PROFILE + MATCH CHART (top of page) ── */}
      <section className="rp-results-hero">
        <div className="fp-container">
          <p className="rp-results-eyebrow">YOUR RESULTS ARE IN</p>
          <h1 className="rp-results-title">
            {name !== 'there' ? `${name}, here's what we found` : 'Here\'s what we found'}
          </h1>
          <p className="rp-results-sub">
            We scored {PEPTIDES.filter(p => p.category === PILLAR_CATEGORY[merged.goal!]).length} products
            in {goalLabel(merged.goal!).toLowerCase()} against your quiz answers.
          </p>
        </div>
      </section>

      <section className="rp-data-section">
        <div className="fp-container">
          <div className="rp-data-grid">
            <ProfileCard
              goal={goalLabel(merged.goal!)}
              challenge={detail}
              energy={merged.energy ? energyLabel(merged.energy) : 'Not specified'}
              duration={merged.duration ? durationLabel(merged.duration) : 'Not specified'}
              outcome={subFocusSummary(merged)}
              level={level}
            />
            <MatchChart scores={scores} goal={merged.goal!} primaryId={primary.id} matchName={primary.sku} />
          </div>
        </div>
      </section>

      {/* ── HERO ── */}
      <section className="fp-hero">
        <div className="fp-container">
          <div className="fp-hero-center">
            <p className="fp-hero-eyebrow">YOUR PERSONALISED MATCH IS READY</p>
            <h1 className="fp-hero-title">{headline}</h1>
            <h2 className="fp-hero-subtitle">{subline}</h2>
            <p className="fp-hero-desc">
              {name !== 'there' ? `${name}, we` : 'We'} analysed your answers and matched you with <strong>{primary.sku}</strong> — specifically chosen for <em>{detail.toLowerCase()}</em>.
              {isBeginner
                ? ' This is a safe, well-studied option with practitioner guidance included at no extra cost.'
                : ' Quiz-taker pricing locked in — practitioner support included.'}
            </p>
          </div>
          <div className="fp-hero-grid">
            <div className="fp-hero-content">
              <ul className="fp-hero-advantages">
                <li><CheckIcon /> Targets your specific {detail.toLowerCase().split(',')[0]}</li>
                <li><CheckIcon /> See real changes within 2–4 weeks</li>
                <li><CheckIcon /> A practitioner personalises your protocol</li>
                {isBeginner
                  ? <li><CheckIcon /> Safe, beginner-friendly — you're guided every step</li>
                  : <li><CheckIcon /> Full batch documentation with QR verification</li>
                }
                <li><CheckIcon /> 30-day guarantee — zero risk to try</li>
                <li><CheckIcon /> Free tracked delivery to your door</li>
              </ul>
              <button type="button" className="fp-btn fp-hero-cta-btn" onClick={goToCheckout}>Claim My Match — £{primaryPrice.now}</button>
              <div className="fp-hero-guarantee">
                <ShieldIcon />
                <span>99.3%+ verified purity · UK-regulated lab · Third-party tested</span>
              </div>
            </div>
            <div className="fp-hero-visual">
              <div className="fp-hero-img-card">
                {primary.image && <img src={primary.image} alt={primary.sku} className="fp-hero-photo" />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF COUNTER ── */}
      <div className="fp-social-bar">
        <div className="fp-container fp-social-bar-inner">
          <div className="fp-social-stat">
            <strong>4,700+</strong>
            <span>UK orders shipped</span>
          </div>
          <div className="fp-social-stat">
            <strong>92%</strong>
            <span>see results in 30 days</span>
          </div>
          <div className="fp-social-stat">
            <strong>4.8/5</strong>
            <span>average rating</span>
          </div>
          <div className="fp-social-stat">
            <strong>2–3 days</strong>
            <span>free UK delivery</span>
          </div>
        </div>
      </div>

      {/* ── WHY THIS MATCH ── */}
      <section className="fp-why">
        <div className="fp-container">
          <h2 className="fp-section-title">
            {isBeginner ? `Why ${primary.sku} is perfect for you` : `Why ${primary.sku} scored highest for your profile`}
          </h2>
          <div className="fp-why-grid">
            <div className="fp-why-card">
              <h3>{isBeginner ? 'Why this is your match' : 'Why it was matched'}</h3>
              <p>{copy.whyMatched}</p>
            </div>
            <div className="fp-why-card">
              <h3>{isBeginner ? 'How it helps you' : 'How it works'}</h3>
              <p>{copy.mechanism}</p>
            </div>
            <div className="fp-why-card">
              <h3>What to expect</h3>
              <p>{copy.expect}</p>
            </div>
          </div>
          <div className="fp-why-ideal">
            <h3>Ideal for:</h3>
            <div className="fp-why-tags">
              {copy.idealFor.map((tag, i) => <span key={i} className="fp-tag">{tag}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section className="fp-included">
        <div className="fp-container">
          <h2 className="fp-section-title">Everything included with your order</h2>
          <div className="fp-included-grid">
            <div className="fp-included-item">
              <span className="fp-included-icon">💊</span>
              <h3>Your matched {primary.sku}</h3>
              <p>Pharmaceutical-grade, UK-manufactured, batch-tested</p>
            </div>
            <div className="fp-included-item">
              <span className="fp-included-icon">👨‍⚕️</span>
              <h3>Practitioner support</h3>
              <p>A real person reviews your profile and guides your dosing</p>
            </div>
            <div className="fp-included-item">
              <span className="fp-included-icon">📋</span>
              <h3>Personalised protocol</h3>
              <p>Dosing schedule tailored to your experience and goals</p>
            </div>
            <div className="fp-included-item">
              <span className="fp-included-icon">🚚</span>
              <h3>Free tracked shipping</h3>
              <p>Discreet packaging, 2–3 business days UK-wide</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── YOUR PLAN + STACKS ── */}
      <section className="fp-plans" id="plans">
        <div className="fp-container">
          <h2 className="fp-section-title">
            {isBeginner ? 'Get started today — everything included' : 'Your matched protocol'}
          </h2>
          <p className="fp-section-sub">
            One price. No memberships. No hidden fees. Practitioner support included free.
          </p>

          <div className={`fp-plans-row ${stacks.length > 0 ? 'fp-plans-row--stacked' : ''}`}>
            {stacks[0] && (
              <StackCheckCard
                stack={stacks[0]}
                checked={checkedStacks.has(stacks[0].peptide.id)}
                onToggle={() => toggleStack(stacks[0].peptide.id)}
                level={level}
              />
            )}
            <PlanCard peptide={primary} rank={1} isBeginner={isBeginner} level={level} stackTotal={stackTotal} onCheckout={goToCheckout} />
            {stacks[1] && (
              <StackCheckCard
                stack={stacks[1]}
                checked={checkedStacks.has(stacks[1].peptide.id)}
                onToggle={() => toggleStack(stacks[1].peptide.id)}
                level={level}
              />
            )}
          </div>
          {stacks.length > 0 && (
            <p className="fp-plans-stack-note">
              Stacks are pre-selected based on practitioner recommendations. Uncheck to remove.
            </p>
          )}
        </div>
      </section>

      {/* ── SUCCESS STORIES ── */}
      <section className="fp-stories" id="reviews">
        <div className="fp-container">
          <h2 className="fp-section-title">Real people. Real results.</h2>
          <p className="fp-section-sub">Quiz-matched customers across the UK sharing their experience</p>
          <div className="fp-ba-hero">
            <img src="/images/success-transformations.png" alt="Before and after transformation results from real customers" />
          </div>
          <div className="fp-reviews-grid">
            {[
              { text: "I was sceptical — another quiz, another product. But this actually matched what I needed. Saw real changes in 2 weeks. The practitioner check-in sealed it for me.", name: "James T.", loc: "Manchester", stars: 5 },
              { text: "Down a full clothing size in 6 weeks. My energy is through the roof. Wish I'd found this sooner instead of wasting money on supplements that didn't work.", name: "Sarah L.", loc: "London", stars: 5 },
              { text: "Completely new to peptides. Peptiva made it simple — clear quiz, clear match, clear instructions. Feeling great after just 3 weeks.", name: "Emily R.", loc: "Bristol", stars: 5 },
              { text: "My knee had been killing me for 2 years. The match was spot on — I'm back to training 4 days a week. Life-changing.", name: "Chris W.", loc: "Leeds", stars: 5 },
            ].map((r, i) => (
              <div key={i} className="fp-review-card">
                <Stars count={r.stars} />
                <p className="fp-review-text">"{r.text}"</p>
                <span className="fp-review-author">{r.name} — {r.loc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="fp-how">
        <div className="fp-container">
          <h2 className="fp-section-title">
            {isBeginner ? 'How it works (it\'s simple)' : 'From quiz to results in 4 steps'}
          </h2>
          <div className="fp-how-grid">
            <div className="fp-how-step">
              <span className="fp-how-num">01</span>
              <h3>Take the Quiz</h3>
              <p>60 seconds. Your answers are scored against {PEPTIDES.length} research-grade products.</p>
            </div>
            <div className="fp-how-step">
              <span className="fp-how-num">02</span>
              <h3>Get Your Match</h3>
              <p>Our algorithm finds the product that fits your specific goals and challenges.</p>
            </div>
            <div className="fp-how-step">
              <span className="fp-how-num">03</span>
              <h3>Practitioner Reviews It</h3>
              <p>A real practitioner personalises your dosing protocol. Free with every order.</p>
            </div>
            <div className="fp-how-step">
              <span className="fp-how-num">04</span>
              <h3>See the Difference</h3>
              <p>92% report results within 30 days. Your practitioner checks in to track progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAFETY & QUALITY ── */}
      <section className="fp-quality">
        <div className="fp-container">
          <div className="fp-quality-box">
            <h2>Our Purity &amp; Quality Guarantee</h2>
            <p>
              {isBeginner
                ? 'We know this might be new for you — so we\'ve built every safety measure in. Your product is made in a UK-regulated lab, tested by an independent third party, and reviewed by a practitioner before it reaches you. If anything doesn\'t meet your expectations, our 30-day guarantee has you covered.'
                : 'Every product is manufactured in our UK-regulated laboratory and independently verified by a third-party lab. Every vial ships with batch documentation, QR-scannable verification, and clear dosing instructions. A practitioner reviews your protocol — included at no extra cost.'
              }
            </p>
            <div className="fp-quality-grid">
              <div className="fp-quality-item">
                <strong>99.3%+</strong>
                <span>Verified Purity</span>
              </div>
              <div className="fp-quality-item">
                <strong>Third-Party</strong>
                <span>Lab Tested</span>
              </div>
              <div className="fp-quality-item">
                <strong>Practitioner</strong>
                <span>Reviewed</span>
              </div>
              <div className="fp-quality-item">
                <strong>30-Day</strong>
                <span>Quality Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="fp-compare">
        <div className="fp-container">
          <h2 className="fp-section-title">Why Peptiva vs. the alternatives?</h2>
          <p className="fp-section-sub">
            {isBeginner
              ? 'We\'re not like random online sellers. Here\'s what makes Peptiva different — and safer.'
              : 'Same category, different standard of evidence and support.'
            }
          </p>
          <div className="fp-compare-table">
            <div className="fp-compare-row fp-compare-header">
              <span></span>
              <span className="fp-compare-us">Peptiva</span>
              <span>Generic Suppliers</span>
              <span>Private Clinics</span>
            </div>
            {[
              ['Personalised Quiz Matching', true, false, false],
              ['99.3%+ Verified Purity', true, false, true],
              ['Third-Party Lab Tested', true, false, true],
              ['Practitioner Support Included', true, false, true],
              ['No Appointment Needed', true, true, false],
              ['Transparent Pricing (no surprises)', true, false, false],
              ['Free UK Shipping', true, true, false],
              ['30-Day Quality Guarantee', true, false, false],
            ].map(([label, us, supp, clinic], i) => (
              <div key={i} className="fp-compare-row">
                <span className="fp-compare-label">{label as string}</span>
                <span className={`fp-compare-cell ${us ? 'fp-yes' : 'fp-no'}`}>{us ? '✓' : '—'}</span>
                <span className={`fp-compare-cell ${supp ? 'fp-yes' : 'fp-no'}`}>{supp ? '✓' : '—'}</span>
                <span className={`fp-compare-cell ${clinic ? 'fp-yes' : 'fp-no'}`}>{clinic ? '✓' : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="fp-faq" id="faq">
        <div className="fp-container">
          <h2 className="fp-section-title">{isBeginner ? 'Got questions? We\'ve got answers.' : 'Frequently asked questions'}</h2>
          <div className="fp-faq-list">
            {isBeginner && (
              <FaqItem q="I'm completely new to this. Is it safe?" a="Absolutely. Every product is manufactured in a UK-regulated laboratory and tested by an independent third-party lab. A real practitioner reviews your quiz profile and guides your dosing — included free. And if you're not happy, our 30-day quality guarantee means zero risk." />
            )}
            <FaqItem q="What exactly are peptides?" a="Peptides are short chains of amino acids — the same building blocks your body already uses. They act as signalling molecules, telling your cells to perform specific functions like burn fat, repair tissue, or boost collagen. Think of them as precise instructions your body already understands." />
            <FaqItem q="What's included with my order?" a="Your matched product, personalised dosing guide from a practitioner, batch certificate with QR verification, Peptiva Concierge access (practitioner support), and free tracked UK shipping in discreet packaging." />
            <FaqItem q="How fast will I see results?" a="Most customers notice changes within 2–4 weeks. 92% of quiz-matched customers report measurable results within 30 days. Your practitioner will check in to make sure you're on track." />
            <FaqItem q="What if it doesn't work for me?" a="We offer a 30-day quality guarantee. If your product doesn't meet specification or you're not satisfied with the quality, we make it right — no questions asked. You can also retake the quiz anytime." />
            <FaqItem q="Is this legal in the UK?" a="Yes. All Peptiva products are manufactured in our UK-regulated laboratory. We comply fully with UK regulations and include full documentation with every order." />
          </div>
        </div>
      </section>

      {/* ── URGENCY CTA BANNER ── */}
      <section className="fp-cta-section">
        <div className="fp-container">
          <h2>
            {isBeginner
              ? `${name !== 'there' ? name + ', your' : 'Your'} match is ready. Don't let it expire.`
              : `Your match is locked in. Claim it before quiz-taker pricing ends.`
            }
          </h2>
          <p>
            {primary.sku} + Practitioner guidance + Dosing protocol + 30-day guarantee. Everything you need for £{primaryPrice.now}.
          </p>
          <button type="button" className="fp-btn fp-btn--light fp-btn--large" onClick={goToCheckout}>Get {primary.sku} Now — £{primaryPrice.now}</button>
          <div className="fp-cta-trust">
            <span>🔒 Secure checkout</span>
            <span>🛡️ 30-day guarantee</span>
            <span>🚚 Free UK shipping</span>
          </div>
        </div>
      </section>

      {/* ── STICKY BAR ── */}
      <div className="fp-sticky">
        <div className="fp-container fp-sticky-inner">
          <div className="fp-sticky-left">
            <strong>{stackTotal > 0 ? `${primary.sku} + Stack` : primary.sku}</strong>
            <span className="fp-sticky-pricing">
              <span className="fp-sticky-now">£{(Math.round((primaryPrice.now + stackTotal) * 100) / 100).toFixed(2)}</span>
            </span>
          </div>
          <button type="button" className="fp-btn fp-btn--sm" onClick={goToCheckout}>{stackTotal > 0 ? 'Get Full Stack' : 'Claim My Match'}</button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="fp-footer">
        <div className="fp-container fp-footer-inner">
          <div className="fp-footer-brand">
            <span className="fp-footer-logo">Peptiva</span>
            <p>All products manufactured in our UK-regulated laboratory. 99.3%+ verified purity. Third-party lab tested. Practitioner-reviewed protocols.</p>
          </div>
          <div className="fp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/">Retake Quiz</Link>
            <a href="#plans">Plans</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="fp-footer-disclaimer">
            All products are sold strictly for research purposes only. Not intended for human consumption. By purchasing, you confirm that you understand and accept this.
          </div>
          <div className="fp-footer-copy">
            © {new Date().getFullYear()} Peptiva Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function StackCheckCard({
  stack, checked, onToggle, level,
}: {
  stack: StackSuggestion; checked: boolean; onToggle: () => void; level: 'beginner' | 'intermediate' | 'advanced'
}) {
  const copy = getCompoundCopy(stack.peptide.id, level)
  return (
    <div className={`fp-scheck ${checked ? 'fp-scheck--active' : ''}`}>
      <label className="fp-scheck-toggle">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="fp-scheck-box" />
        <span className="fp-scheck-label">{checked ? 'Added to stack' : 'Add to stack'}</span>
      </label>
      <div className="fp-scheck-ribbon">STACK PARTNER</div>
      <div className="fp-scheck-img">
        {stack.peptide.image && <img src={stack.peptide.image} alt={stack.peptide.sku} />}
      </div>
      <div className="fp-scheck-body">
        <h3 className="fp-scheck-name">{stack.peptide.sku}</h3>
        <p className="fp-scheck-tagline">{stack.peptide.tagline}</p>
        <div className="fp-scheck-pricing">
          <span className="fp-scheck-now">£{stack.discountedPrice.toFixed(2)}</span>
          <span className="fp-scheck-was">£{stack.originalPrice.toFixed(2)}</span>
          <span className="fp-scheck-save">{stack.discountPct}% off</span>
        </div>
        <p className="fp-scheck-why">
          <strong>Why stack this:</strong> {stack.reason}
        </p>
        <p className="fp-scheck-expect">{copy.expect.split('.').slice(0, 2).join('.') + '.'}</p>
        <div className="fp-scheck-features">
          <div><CheckIcon /> {copy.idealFor[0]}</div>
          <div><CheckIcon /> {copy.idealFor[1] || 'Practitioner recommended'}</div>
          <div><CheckIcon /> Free UK shipping</div>
        </div>
        <button type="button" className={`fp-btn fp-scheck-cta ${checked ? '' : 'fp-scheck-cta--outline'}`} onClick={onToggle}>
          {checked ? `✓ Added — £${stack.discountedPrice.toFixed(2)}` : `+ Add to Stack — £${stack.discountedPrice.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}

function PlanCard({ peptide, rank, isBeginner, level, stackTotal, onCheckout }: { peptide: Peptide; rank: number; isBeginner: boolean; level: 'beginner' | 'intermediate' | 'advanced'; stackTotal: number; onCheckout: () => void }) {
  const recIdx = recommendedDoseIndex(peptide, level)
  const [selectedDose, setSelectedDose] = useState(recIdx)
  const dose = peptide.doses[selectedDose] || peptide.doses[0]
  const total = Math.round((dose.price + stackTotal) * 100) / 100

  return (
    <div className={`fp-plan ${rank === 1 ? 'fp-plan--primary' : ''}`}>
      {rank === 1 && <div className="fp-plan-ribbon">Your #1 Match</div>}
      <div className="fp-plan-img">
        {peptide.image && <img src={peptide.image} alt={peptide.sku} />}
      </div>
      <div className="fp-plan-body">
        <h3 className="fp-plan-name">{peptide.sku}</h3>
        <p className="fp-plan-compound">{peptide.tagline}</p>
        {peptide.doses.length > 1 && (
          <div className="fp-dose-selector">
            {peptide.doses.map((d, i) => (
              <button
                key={d.mg}
                type="button"
                className={`fp-dose-btn ${i === selectedDose ? 'fp-dose-btn--active' : ''}`}
                onClick={() => setSelectedDose(i)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        <div className="fp-plan-pricing">
          <span className="fp-plan-now">£{dose.price}</span>
          {peptide.doses.length > 1 && <span className="fp-plan-dose-label">{dose.label}</span>}
        </div>
        <p className="fp-plan-desc">{peptide.description}</p>
        <div className="fp-plan-features">
          <div><CheckIcon /> Practitioner support included (£0)</div>
          <div><CheckIcon /> 99.3%+ verified purity</div>
          <div><CheckIcon /> Personalised dosing protocol</div>
          <div><CheckIcon /> Free UK shipping</div>
          {isBeginner
            ? <div><CheckIcon /> Beginner-friendly starter guide</div>
            : <div><CheckIcon /> Full batch documentation</div>
          }
          <div><CheckIcon /> 30-day quality guarantee</div>
        </div>
        <button type="button" className="fp-btn fp-plan-cta" onClick={onCheckout}>
          {stackTotal > 0
            ? `Get Full Stack — £${total.toFixed(2)}`
            : `Get ${peptide.sku} Now — £${dose.price}`
          }
        </button>
        {stackTotal > 0 && (
          <p className="fp-plan-stack-breakdown">
            {peptide.sku} £{dose.price} + stack savings applied
          </p>
        )}
        <div className="fp-plan-guarantee">
          <ShieldIcon />
          <span>99.3%+ purity guaranteed · UK-regulated · Third-party lab tested</span>
        </div>
      </div>
    </div>
  )
}
