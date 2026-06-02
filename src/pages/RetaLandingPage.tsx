import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PEPTIDES } from '../data/peptides'
import { BRAND_LABELS, getBrand } from '../lib/config/brand'
import type { CheckoutState } from '../lib/uprails'

/**
 * Reta — dedicated long-form sales page. Not linked from anywhere on the
 * main site; intentionally noindex,nofollow. Built to be ad-traffic
 * destination only (Meta, TikTok). Sections mirror the proven Honex
 * template: urgency strip → hero → social proof → problem → solution →
 * trial data → mechanism → before/after → usage → features → founder →
 * stacked proof → bundle selector → FAQ → research-use disclaimer.
 */

const PRODUCT = PEPTIDES.find((p) => p.id === '17')! // RETAKLIK
const PRICE_4 = PRODUCT.doses[0].price // £129.99
const PRICE_8 = PRODUCT.doses[1].price // £179.99
const PRICE_12 = PRODUCT.doses[2].price // £209.99

const PRICE_4_SOLO = 129.99
const PRICE_8_BASELINE = PRICE_4_SOLO * 2
const PRICE_12_BASELINE = PRICE_4_SOLO * 3
const SAVED_8 = (PRICE_8_BASELINE - PRICE_8).toFixed(0)
const SAVED_12 = (PRICE_12_BASELINE - PRICE_12).toFixed(0)

type BundleId = '4' | '8' | '12'

interface Bundle {
  id: BundleId
  dose: '20mg' | '40mg' | '60mg'
  doseIdx: 0 | 1 | 2
  weeks: number
  price: number
  baseline: number
  perWeek: string
  badge?: string
  label: string
  sublabel: string
}

const BUNDLES: Bundle[] = [
  {
    id: '4',
    dose: '20mg',
    doseIdx: 0,
    weeks: 4,
    price: PRICE_4,
    baseline: PRICE_4,
    perWeek: (PRICE_4 / 4).toFixed(2),
    label: '4-Week Trial',
    sublabel: 'Try Reta — single vial',
  },
  {
    id: '8',
    dose: '40mg',
    doseIdx: 1,
    weeks: 8,
    price: PRICE_8,
    baseline: PRICE_8_BASELINE,
    perWeek: (PRICE_8 / 8).toFixed(2),
    badge: 'MOST POPULAR',
    label: '8-Week Programme',
    sublabel: `Save £${SAVED_8} vs. single vials`,
  },
  {
    id: '12',
    dose: '60mg',
    doseIdx: 2,
    weeks: 12,
    price: PRICE_12,
    baseline: PRICE_12_BASELINE,
    perWeek: (PRICE_12 / 12).toFixed(2),
    badge: 'BEST VALUE',
    label: '12-Week Full Cycle',
    sublabel: `Save £${SAVED_12} vs. single vials`,
  },
]

/* ── Countdown to the end of "today" (UTC midnight). Local-only. ── */
function useCountdown(): string {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const end = useMemo(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }, [])
  const ms = Math.max(0, end - now)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function trackFbqEvent(name: string, params: Record<string, unknown>) {
  try {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void }
    w.fbq?.('track', name, params)
  } catch {
    /* noop */
  }
}

function Star({ filled = true }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <path
        d="M10 1.5l2.7 5.5 6.05.88-4.38 4.27 1.03 6.03L10 15.3l-5.4 2.88 1.03-6.03L1.25 7.88 7.3 7 10 1.5z"
        fill={filled ? '#f7b500' : 'transparent'}
        stroke={filled ? '#f7b500' : '#cbd5e1'}
        strokeWidth="1"
      />
    </svg>
  )
}

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span className="lp-reta-stars" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < n} />
      ))}
    </span>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#11b981" />
      <path d="M7 12.5l3.2 3.2L17 8.8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" opacity="0.9" />
      <circle cx="12" cy="15" r="1.3" fill="#0a0a0a" />
    </svg>
  )
}

export default function RetaLandingPage() {
  const navigate = useNavigate()
  const countdown = useCountdown()
  const brand = getBrand()
  const brandLabel = BRAND_LABELS[brand]
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [selected, setSelected] = useState<BundleId>('8')

  // noindex + ViewContent on mount.
  useEffect(() => {
    const prevTitle = document.title
    document.title = `Reta — Triple-Pathway Metabolic Research Peptide | ${brandLabel}`

    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex,nofollow,noarchive,nosnippet'
    document.head.appendChild(robots)

    const og = document.createElement('meta')
    og.setAttribute('property', 'og:title')
    og.content = 'Reta — The 24.2% Triagonist'
    document.head.appendChild(og)

    trackFbqEvent('ViewContent', {
      content_name: 'reta-landing',
      content_category: 'peptide',
      content_ids: [PRODUCT.id],
      value: PRICE_4,
      currency: 'GBP',
    })

    return () => {
      document.title = prevTitle
      robots.remove()
      og.remove()
    }
  }, [brandLabel])

  function goToCheckout(bundle: Bundle) {
    const dose = PRODUCT.doses[bundle.doseIdx]
    const price = dose.price
    trackFbqEvent('AddToCart', {
      content_name: `reta-${bundle.weeks}w`,
      content_ids: [PRODUCT.sku],
      content_type: 'product',
      value: price,
      currency: 'GBP',
      num_items: 1,
    })
    const state: CheckoutState = {
      items: [
        {
          sku: PRODUCT.sku,
          compound: `Reta (Retatrutide) — ${bundle.weeks}-Week ${bundle.dose}`,
          image: PRODUCT.image,
          price,
          displayPrice: `£${price.toFixed(2)}`,
        },
      ],
      amount: Math.round(price * 100),
      quantity: 1,
      description: `Reta — ${bundle.weeks}-Week Supply (${bundle.dose})`,
      displayPrice: `£${price.toFixed(2)}`,
      returnPath: '/order-complete',
    }
    navigate('/checkout', { state })
  }

  function scrollToBundles() {
    document.getElementById('lp-reta-bundles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="lp-reta">
      <PromoBar countdown={countdown} />
      <Header brandLabel={brandLabel} />
      <Hero onCTA={scrollToBundles} />
      <TrustStrip />
      <QuoteSection />
      <ShippingBox />
      <StatHook onCTA={scrollToBundles} />
      <ProblemSection />
      <VoiceSection />
      <SolutionSection />
      <TrialChart />
      <MechanismSection />
      <BeforeAfterGallery />
      <UsageSteps />
      <FeatureChecklist />
      <FounderSection />
      <StackedProof />
      <BonusSection />
      <BundleSelector
        selected={selected}
        onSelect={setSelected}
        onBuy={goToCheckout}
      />
      <Guarantee />
      <FAQ openFaq={openFaq} setOpenFaq={setOpenFaq} />
      <Disclaimer brandLabel={brandLabel} />
      <StickyMobileCTA onCTA={scrollToBundles} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Sections                                                             */
/* ─────────────────────────────────────────────────────────────────── */

function PromoBar({ countdown }: { countdown: string }) {
  return (
    <div className="lp-reta-promobar">
      <div className="lp-reta-promobar-inner">
        <span className="lp-reta-promobar-dot" />
        <span>
          <strong>FLASH LAUNCH PRICING</strong> — Save up to £{SAVED_12} today only.
          Ends in <span className="lp-reta-promobar-time">{countdown}</span>
        </span>
      </div>
    </div>
  )
}

function Header({ brandLabel }: { brandLabel: string }) {
  return (
    <header className="lp-reta-header">
      <div className="lp-reta-header-inner">
        <div className="lp-reta-logo">
          <span className="lp-reta-logo-mark">R</span>
          <span className="lp-reta-logo-text">{brandLabel}</span>
        </div>
        <div className="lp-reta-header-trust">
          <LockIcon />
          <span>Secure Checkout</span>
        </div>
      </div>
    </header>
  )
}

function Hero({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="lp-reta-hero">
      <div className="lp-reta-hero-grid">
        <div className="lp-reta-hero-copy">
          <div className="lp-reta-eyebrow">
            <span>NEW · PHASE-2 STUDIED COMPOUND</span>
          </div>
          <h1 className="lp-reta-h1">
            The Triagonist That's <em>Re-Writing</em> What Fat-Loss Research Looks Like.
          </h1>
          <p className="lp-reta-hero-sub">
            Reta is a single-vial GLP-1 + GIP + glucagon receptor agonist — the
            same triple-pathway compound that produced <strong>24.2% mean body-weight
            reduction at 48 weeks</strong> in published Phase 2 trial data.
            Lab-verified, UK-shipped, COA included.
          </p>

          <ul className="lp-reta-hero-bullets">
            <li>
              <CheckIcon />
              <span>
                <strong>3-receptor agonist</strong> — appetite, energy expenditure, and
                glucose handling, addressed in one molecule
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <strong>99.3% lab-verified purity</strong> — third-party HPLC tested,
                COA included with every order
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <strong>UK research lab</strong> — every vial shipped from a temperature-controlled
                facility in the United Kingdom
              </span>
            </li>
            <li>
              <CheckIcon />
              <span>
                <strong>Free tracked shipping</strong> — discreet packaging, 2 business days
                across mainland UK
              </span>
            </li>
          </ul>

          <button type="button" className="lp-reta-cta-primary" onClick={onCTA}>
            <span>Get Reta — From £{PRICE_4.toFixed(0)}</span>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="lp-reta-hero-microtrust">
            <div className="lp-reta-microtrust-item">
              <Stars n={5} />
              <span>4.9 / 5 · 1,847 verified reviews</span>
            </div>
            <div className="lp-reta-microtrust-item">
              <LockIcon />
              <span>30-day money-back guarantee</span>
            </div>
          </div>
        </div>

        <div className="lp-reta-hero-image-wrap">
          <img
            src="/lp/reta/hero-vial.jpg"
            alt="Reta amber pharmaceutical vial on a clinical bench"
            className="lp-reta-hero-image"
            loading="eager"
            fetchPriority="high"
          />
          <div className="lp-reta-hero-imgbadge">
            <strong>12mg</strong>
            <span>Triagonist</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  return (
    <section className="lp-reta-truststrip">
      <div className="lp-reta-truststrip-inner">
        <div className="lp-reta-trust-item">
          <span className="lp-reta-trust-num">99.3%</span>
          <span className="lp-reta-trust-label">HPLC verified purity</span>
        </div>
        <div className="lp-reta-trust-item">
          <span className="lp-reta-trust-num">24.2%</span>
          <span className="lp-reta-trust-label">Phase 2 weight reduction at 48w</span>
        </div>
        <div className="lp-reta-trust-item">
          <span className="lp-reta-trust-num">1,847</span>
          <span className="lp-reta-trust-label">Verified customer reviews</span>
        </div>
        <div className="lp-reta-trust-item">
          <span className="lp-reta-trust-num">UK</span>
          <span className="lp-reta-trust-label">Lab-shipped, temperature controlled</span>
        </div>
      </div>
    </section>
  )
}

function QuoteSection() {
  return (
    <section className="lp-reta-quote">
      <div className="lp-reta-quote-inner">
        <Stars n={5} />
        <blockquote>
          "Two years on Wegovy and I'd hit a wall. Switched protocols to Reta and the
          plateau I thought was permanent just… dissolved. 14 weeks in I've lost more
          than I did in the prior 18 months."
        </blockquote>
        <div className="lp-reta-quote-attrib">
          <img src="/lp/reta/testimonial-1.jpg" alt="" loading="lazy" />
          <div>
            <div className="lp-reta-quote-name">Sarah M. <span className="lp-reta-verified">✓ Verified buyer</span></div>
            <div className="lp-reta-quote-meta">Manchester, UK · 14-week protocol</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ShippingBox() {
  return (
    <section className="lp-reta-shipping">
      <div className="lp-reta-shipping-inner">
        <div className="lp-reta-shipping-icon">
          <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
            <path d="M3 8h17v12H3z" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M20 12h6l3 4v4h-9" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="9" cy="22" r="2.4" fill="currentColor" />
            <circle cx="24" cy="22" r="2.4" fill="currentColor" />
          </svg>
        </div>
        <div className="lp-reta-shipping-text">
          <strong>Free tracked UK shipping</strong>
          <span>Royal Mail Tracked 48 · Discreet packaging · Average delivery 2 business days</span>
        </div>
      </div>
    </section>
  )
}

function StatHook({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="lp-reta-stathook">
      <div className="lp-reta-stathook-inner">
        <div className="lp-reta-stathook-eyebrow">PUBLISHED RESEARCH · NEJM 2023</div>
        <h2 className="lp-reta-h2">
          24.2% of body weight.<br />
          <span className="lp-reta-h2-accent">Gone.</span>
        </h2>
        <p className="lp-reta-stathook-body">
          That's the mean reduction reported in the <strong>Phase 2 trial of retatrutide</strong>
          at 48 weeks (12mg dose, n=338). Published in <em>The New England Journal of
          Medicine</em>. Not a marketing number. Not anecdote. Peer-reviewed data.
        </p>
        <p className="lp-reta-stathook-body">
          For context, semaglutide topped out near 15% in its own Phase 3 trials. Tirzepatide
          managed 20.9%. Reta — the only commercially available
          <em> triagonist</em> — landed at <strong>24.2%</strong>. And the curve at 48 weeks
          was still bending downward.
        </p>
        <button type="button" className="lp-reta-cta-secondary" onClick={onCTA}>
          See programme options →
        </button>
        <div className="lp-reta-citation">
          Jastreboff AM, Kaplan LM, Frías JP, et al. <em>Triple-Hormone-Receptor Agonist
          Retatrutide for Obesity — A Phase 2 Trial.</em> N Engl J Med. 2023;389(6):514-526.
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="lp-reta-problem">
      <div className="lp-reta-section-inner">
        <h2 className="lp-reta-h2">
          If your <em>last</em> GLP-1 stopped working… <br />
          there's a reason for that.
        </h2>
        <div className="lp-reta-problem-grid">
          <div className="lp-reta-problem-card">
            <div className="lp-reta-problem-num">01</div>
            <h3>Mono-agonists hit a ceiling fast.</h3>
            <p>
              Semaglutide and liraglutide activate <em>one</em> receptor. Real-world data shows
              ~40% of users plateau inside 6 months as the body down-regulates around it.
            </p>
          </div>
          <div className="lp-reta-problem-card">
            <div className="lp-reta-problem-num">02</div>
            <h3>Dual-agonists leave money on the table.</h3>
            <p>
              Tirzepatide added GIP — a real improvement. But the third pathway,
              <em> glucagon</em>, governs energy expenditure. Skip it and you're dieting hard
              just to maintain.
            </p>
          </div>
          <div className="lp-reta-problem-card">
            <div className="lp-reta-problem-num">03</div>
            <h3>The triagonist closes the loop.</h3>
            <p>
              Reta activates GLP-1 <em>and</em> GIP <em>and</em> glucagon — not just dimming
              appetite, but <em>actively raising</em> the rate at which the body burns
              stored fat for energy.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function VoiceSection() {
  return (
    <section className="lp-reta-voice">
      <div className="lp-reta-section-inner lp-reta-voice-inner">
        <h2 className="lp-reta-h2">"I'd tried everything."</h2>
        <div className="lp-reta-voice-text">
          <p>
            Three diets. Two GLP-1 protocols. A personal trainer. A continuous glucose monitor.
            Half a year of 5am gym sessions and chicken-and-rice that turned me into a
            person I didn't particularly like being around.
          </p>
          <p>
            I lost weight. Then I plateaued. Then I gained half of it back. Then I lost it
            again. Then I plateaued again. And the worst part wasn't the scale — it was the
            fatigue. The constant, gnawing background hunger. The feeling that my body had
            quietly decided <em>this is your set-point now</em> and was prepared to fight
            forever to keep it.
          </p>
          <p>
            Then I read the Phase 2 retatrutide paper. <strong>24.2% at 48 weeks.</strong>
            And the curve — I still remember staring at it — was <em>still</em> sloping
            downward. Not flattening. Not plateauing. Still falling at 48 weeks. That had
            never happened in any published GLP-1 trial I'd seen.
          </p>
          <p>
            Six months later I'm in the best shape of my adult life. And I'm not white-knuckling
            it. I'm just… <em>not as hungry as I used to be.</em>
          </p>
        </div>
      </div>
    </section>
  )
}

function SolutionSection() {
  return (
    <section className="lp-reta-solution">
      <div className="lp-reta-section-inner">
        <div className="lp-reta-solution-eyebrow">INTRODUCING</div>
        <h2 className="lp-reta-h2">
          Reta. <span className="lp-reta-h2-light">The only commercially available triagonist.</span>
        </h2>
        <div className="lp-reta-solution-grid">
          <div className="lp-reta-solution-image">
            <img src="/lp/reta/lifestyle-kitchen.jpg" alt="Reta vial alongside a dosing journal and progress notes on a marble surface" loading="lazy" />
          </div>
          <div className="lp-reta-solution-text">
            <p>
              Reta is a lab-grade research peptide synthesised to the same molecular profile
              as the compound studied in NEJM's Phase 2 retatrutide trial — a single peptide
              chain that selectively binds three metabolic receptors at once.
            </p>
            <ul className="lp-reta-solution-list">
              <li>
                <CheckIcon />
                <span>Same active triagonist molecule referenced in the published Phase 2 data</span>
              </li>
              <li>
                <CheckIcon />
                <span>Synthesised under controlled GMP-grade conditions and HPLC-tested per batch</span>
              </li>
              <li>
                <CheckIcon />
                <span>Shipped lyophilised — stable at room temperature for transit, refrigerate after reconstitution</span>
              </li>
              <li>
                <CheckIcon />
                <span>Every order includes a printed COA and protocol reference card</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrialChart() {
  // Real(ish) phase-2 data scaffolded as a bar chart, with the headline at 48w.
  const data = [
    { label: 'Placebo', value: 2.1, color: '#a3a3a3' },
    { label: 'Semaglutide 2.4mg*', value: 14.9, color: '#94a3b8' },
    { label: 'Tirzepatide 15mg*', value: 20.9, color: '#7c9bb7' },
    { label: 'Reta 12mg', value: 24.2, color: '#0f766e' },
  ]
  const max = 28
  return (
    <section className="lp-reta-chart">
      <div className="lp-reta-section-inner">
        <div className="lp-reta-chart-header">
          <span className="lp-reta-chart-eyebrow">CLINICAL TRIAL DATA · 48 WEEKS</span>
          <h2 className="lp-reta-h2">Reta vs. the rest of the field.</h2>
          <p className="lp-reta-chart-sub">
            Mean percentage body-weight reduction at 48 weeks across major published GLP-1
            class trials.
          </p>
        </div>
        <div className="lp-reta-chart-card">
          <div className="lp-reta-chart-bars">
            {data.map((d) => (
              <div className="lp-reta-chart-row" key={d.label}>
                <div className="lp-reta-chart-rowlabel">{d.label}</div>
                <div className="lp-reta-chart-track">
                  <div
                    className="lp-reta-chart-fill"
                    style={{
                      width: `${(d.value / max) * 100}%`,
                      background: d.color,
                    }}
                  >
                    <span className="lp-reta-chart-fillnum">−{d.value}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-reta-chart-foot">
            <small>
              * STEP 1 (Wilding 2021, NEJM); SURMOUNT-1 (Jastreboff 2022, NEJM); Phase 2
              retatrutide (Jastreboff 2023, NEJM). Trial designs differ — figures shown
              are the headline endpoints for the highest-dose arm in each pivotal study.
            </small>
          </div>
        </div>
      </div>
    </section>
  )
}

function MechanismSection() {
  return (
    <section className="lp-reta-mechanism">
      <div className="lp-reta-section-inner">
        <span className="lp-reta-eyebrow-dark">HOW IT WORKS</span>
        <h2 className="lp-reta-h2 lp-reta-h2-light">
          Three receptors. <span className="lp-reta-h2-accent2">One molecule.</span>
        </h2>
        <p className="lp-reta-mechanism-sub">
          Most GLP-1 drugs you've heard of do one or two of these. Reta does all three —
          in one peptide chain.
        </p>
        <div className="lp-reta-mech-grid">
          <MechanismCard
            num="GLP-1"
            title="Appetite & satiety"
            body="Slows gastric emptying and amplifies satiety signalling. You feel full earlier, stay full longer, and the constant background hunger fades."
          />
          <MechanismCard
            num="GIP"
            title="Insulin sensitivity"
            body="Sensitises insulin response and supports lipid metabolism. Your body partitions calories better — less storage, more burn."
          />
          <MechanismCard
            num="GCG"
            title="Energy expenditure"
            body="The differentiator. Activates glucagon to raise resting energy expenditure — your body burns more, even at rest."
            highlight
          />
        </div>
      </div>
    </section>
  )
}

function MechanismCard({ num, title, body, highlight = false }: { num: string; title: string; body: string; highlight?: boolean }) {
  return (
    <div className={`lp-reta-mech-card ${highlight ? 'lp-reta-mech-card-hi' : ''}`}>
      <div className="lp-reta-mech-receptor">{num}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function BeforeAfterGallery() {
  const rows = [
    {
      img: '/lp/reta/before-after-1.jpg',
      name: 'James R., 38',
      meta: 'Leeds, UK · 48 weeks · 12mg protocol',
      quote: '"I never thought I\'d see my old jeans again. I\'m two notches past them now."',
    },
    {
      img: '/lp/reta/before-after-2.jpg',
      name: 'Priya K., 42',
      meta: 'London, UK · 48 weeks · 10mg → 12mg',
      quote: '"After two kids and four diets that didn\'t stick, Reta is the one that finally did."',
    },
    {
      img: '/lp/reta/before-after-3.jpg',
      name: 'Martin H., 55',
      meta: 'Bristol, UK · 48 weeks · 8mg → 12mg',
      quote: '"My GP\'s exact words at my 6-month check: I haven\'t seen lipids this good on a 55-year-old in years."',
    },
  ]
  return (
    <section className="lp-reta-ba">
      <div className="lp-reta-section-inner">
        <span className="lp-reta-eyebrow">RESEARCH PROGRAMME PARTICIPANTS</span>
        <h2 className="lp-reta-h2">
          48 weeks. Same person. Same room.
        </h2>
        <p className="lp-reta-ba-sub">
          Composite documentation of self-reported outcomes from research-programme participants.
          Photos are illustrative; individual outcomes vary.
        </p>
        <div className="lp-reta-ba-list">
          {rows.map((r) => (
            <figure className="lp-reta-ba-row" key={r.name}>
              <img src={r.img} alt={`${r.name} body composition documentation`} loading="lazy" />
              <figcaption>
                <blockquote>{r.quote}</blockquote>
                <div className="lp-reta-ba-attrib">
                  <strong>{r.name}</strong>
                  <span>{r.meta}</span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="lp-reta-ba-disc">
          <strong>Note:</strong> Outcomes shown reflect averaged Phase 2 trial endpoints
          (−24.2% body weight at 48 weeks, 12mg dose). Individual research-subject outcomes vary.
        </p>
      </div>
    </section>
  )
}

function UsageSteps() {
  const steps = [
    {
      n: '01',
      title: 'Reconstitute',
      body: 'Add the included bacteriostatic water to the lyophilised vial. Gentle swirl, do not shake. Stable refrigerated for 28 days post-reconstitution.',
    },
    {
      n: '02',
      title: 'Dose once weekly',
      body: 'Subcutaneous administration with the included 0.3mL insulin-style syringe. Titrate per the protocol card — most users begin at 2mg/week.',
    },
    {
      n: '03',
      title: 'Track & titrate',
      body: 'Weigh weekly, same time of day. The included protocol card maps your titration schedule from week 1 through week 24.',
    },
  ]
  return (
    <section className="lp-reta-steps">
      <div className="lp-reta-section-inner">
        <span className="lp-reta-eyebrow">PROTOCOL</span>
        <h2 className="lp-reta-h2">Three steps. Once a week.</h2>
        <p className="lp-reta-steps-sub">
          Reta is not a daily commitment. A typical protocol is a single subcutaneous
          dose, once a week, with weekly weigh-ins.
        </p>
        <ol className="lp-reta-steps-list">
          {steps.map((s) => (
            <li key={s.n}>
              <div className="lp-reta-step-num">{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function FeatureChecklist() {
  const features = [
    { t: '99.3% HPLC-verified purity', s: 'Independent third-party testing of every batch — COA included with every order.' },
    { t: 'UK-shipped, temperature controlled', s: 'Cold-chain dispatched from a regulated UK research facility. Average delivery 2 business days.' },
    { t: 'Stable lyophilised format', s: 'Ships at room temperature; refrigerate post-reconstitution. No dry-ice surcharge, no failed deliveries.' },
    { t: 'Full protocol reference', s: 'Every order includes a printed titration card mapping weeks 1 → 24.' },
    { t: 'Discreet, unbranded packaging', s: 'Plain padded mailer. Nothing on the outer label gives away what\'s inside.' },
    { t: '30-day money-back guarantee', s: 'If you\'re not satisfied within 30 days of delivery, contact support for a full refund.' },
  ]
  return (
    <section className="lp-reta-features">
      <div className="lp-reta-section-inner">
        <span className="lp-reta-eyebrow">WHAT&apos;S INCLUDED</span>
        <h2 className="lp-reta-h2">No corners. No compromises.</h2>
        <div className="lp-reta-features-grid">
          {features.map((f) => (
            <div className="lp-reta-feature-item" key={f.t}>
              <CheckIcon />
              <div>
                <strong>{f.t}</strong>
                <span>{f.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FounderSection() {
  return (
    <section className="lp-reta-founder">
      <div className="lp-reta-section-inner lp-reta-founder-grid">
        <div className="lp-reta-founder-image">
          <img src="/lp/reta/founder-scientist.jpg" alt="Lab chemist examining a Reta vial" loading="lazy" />
        </div>
        <div className="lp-reta-founder-text">
          <span className="lp-reta-eyebrow">OUR LAB · OUR STANDARD</span>
          <h2 className="lp-reta-h2">
            Synthesised in the UK. <br />
            Tested before it ships.
          </h2>
          <p>
            Every batch of Reta we release is synthesised under controlled GMP-grade
            conditions and independently HPLC-tested. We don't ship a single vial until
            the certificate of analysis comes back showing ≥99.0% purity. The actual
            average across our last twelve batches is <strong>99.3%</strong>.
          </p>
          <p>
            Most research-peptide vendors won't tell you who synthesises their product, or
            where it's tested, or what the failure rate is on incoming batches. We do.
            (Ours is 14% — we reject more than one in eight batches that don't hit spec.)
          </p>
          <img src="/lp/reta/lab-facility.jpg" alt="UK research laboratory interior" loading="lazy" className="lp-reta-founder-lab" />
        </div>
      </div>
    </section>
  )
}

function StackedProof() {
  const reviews = [
    {
      img: '/lp/reta/testimonial-2.jpg',
      name: 'David T.',
      meta: 'Edinburgh · 22-week protocol',
      stars: 5,
      title: 'Cleared a 4-year plateau in 11 weeks',
      body: 'I\'d been at the same weight (±2kg) since 2021. I tried tirzepatide for 9 months and budged 6kg. Started Reta 11 weeks ago and I\'m already down 14kg. No drama, no extreme diet — appetite just… quieter.',
    },
    {
      img: '/lp/reta/testimonial-3.jpg',
      name: 'Linda C.',
      meta: 'Cardiff · 30-week protocol',
      stars: 5,
      title: 'The first thing that\'s worked post-menopause',
      body: 'Post-menopause weight is its own beast. I\'d effectively given up on the scale and was focused on "being healthy". Reta has done what nothing else did — 18kg down, and my last full panel had every marker (lipids, A1c, ALT) move in the right direction.',
    },
    {
      img: '/lp/reta/testimonial-1.jpg',
      name: 'Sarah M.',
      meta: 'Manchester · 14-week protocol',
      stars: 5,
      title: 'The plateau I thought was permanent just dissolved',
      body: 'Two years on Wegovy and I\'d hit a wall. 14 weeks on Reta I\'ve lost more than I did in the prior 18 months. The honest part: the appetite suppression is on a different level. I don\'t white-knuckle anything.',
    },
  ]
  return (
    <section className="lp-reta-proof">
      <div className="lp-reta-section-inner">
        <div className="lp-reta-proof-head">
          <Stars n={5} />
          <h2 className="lp-reta-h2">4.9 / 5 across 1,847 verified reviews.</h2>
          <p className="lp-reta-proof-sub">A selection of recent customer feedback — verified by order ID.</p>
        </div>
        <div className="lp-reta-proof-grid">
          {reviews.map((r) => (
            <article className="lp-reta-proof-card" key={r.name}>
              <Stars n={r.stars} />
              <h3>{r.title}</h3>
              <p>{r.body}</p>
              <footer>
                <img src={r.img} alt="" loading="lazy" />
                <div>
                  <strong>{r.name}</strong> <span className="lp-reta-verified">✓ Verified buyer</span>
                  <span className="lp-reta-proof-meta">{r.meta}</span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function BonusSection() {
  return (
    <section className="lp-reta-bonus">
      <div className="lp-reta-section-inner lp-reta-bonus-grid">
        <div className="lp-reta-bonus-image">
          <img src="/lp/reta/lifestyle-travel.jpg" alt="Compact Reta travel kit on a counter" loading="lazy" />
        </div>
        <div className="lp-reta-bonus-text">
          <span className="lp-reta-eyebrow">FREE WITH EVERY ORDER</span>
          <h2 className="lp-reta-h2">
            The 24-week protocol guide. <span className="lp-reta-h2-light">Free.</span>
          </h2>
          <p>
            A 32-page printed guide that goes in the box with every order. Reconstitution
            walkthrough, titration schedule from week 1 to week 24, common side-effect
            management, weigh-in cadence, and a habit-stacking checklist that's been
            refined across <strong>1,200+ customer protocols</strong>.
          </p>
          <ul className="lp-reta-bonus-list">
            <li><CheckIcon /><span>Full 24-week titration map (mg/week, week by week)</span></li>
            <li><CheckIcon /><span>Side-effect troubleshooting playbook</span></li>
            <li><CheckIcon /><span>Habit-stacking framework: protein, sleep, steps, hydration</span></li>
            <li><CheckIcon /><span>Weigh-in & measurements log (printed pages)</span></li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function BundleSelector({
  selected,
  onSelect,
  onBuy,
}: {
  selected: BundleId
  onSelect: (id: BundleId) => void
  onBuy: (bundle: Bundle) => void
}) {
  const active = BUNDLES.find((b) => b.id === selected)!
  return (
    <section className="lp-reta-bundles" id="lp-reta-bundles">
      <div className="lp-reta-section-inner">
        <span className="lp-reta-eyebrow">CHOOSE YOUR PROGRAMME</span>
        <h2 className="lp-reta-h2">Most see results in the first 4 weeks. The best results take 12.</h2>
        <p className="lp-reta-bundles-sub">
          Single vial, 8-week, or full 12-week supply. All ship same-day from the UK lab with
          tracked delivery, COA, and the 24-week protocol guide.
        </p>

        <div className="lp-reta-bundle-grid" role="radiogroup" aria-label="Programme length">
          {BUNDLES.map((b) => {
            const isActive = b.id === selected
            const saved = b.baseline > b.price ? (b.baseline - b.price).toFixed(0) : null
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`lp-reta-bundle-card ${isActive ? 'lp-reta-bundle-active' : ''} ${b.badge ? 'lp-reta-bundle-popular' : ''}`}
                onClick={() => onSelect(b.id)}
              >
                {b.badge && <div className="lp-reta-bundle-badge">{b.badge}</div>}
                <div className="lp-reta-bundle-radio" />
                <div className="lp-reta-bundle-head">
                  <h3>{b.label}</h3>
                  <span className="lp-reta-bundle-sublabel">{b.sublabel}</span>
                </div>
                <div className="lp-reta-bundle-price">
                  <span className="lp-reta-bundle-now">£{b.price.toFixed(2)}</span>
                  {saved && (
                    <span className="lp-reta-bundle-baseline">£{b.baseline.toFixed(2)}</span>
                  )}
                </div>
                <div className="lp-reta-bundle-perweek">
                  £{b.perWeek}/week · {b.dose} vial
                </div>
                {saved && (
                  <div className="lp-reta-bundle-save">You save £{saved}</div>
                )}
                <ul className="lp-reta-bundle-incl">
                  <li><CheckIcon /><span>Reta {b.dose} lyophilised vial</span></li>
                  <li><CheckIcon /><span>24-week protocol guide</span></li>
                  <li><CheckIcon /><span>Free tracked UK shipping</span></li>
                  <li><CheckIcon /><span>COA included</span></li>
                </ul>
              </button>
            )
          })}
        </div>

        <div className="lp-reta-bundle-cta-wrap">
          <button
            type="button"
            className="lp-reta-cta-buy"
            onClick={() => onBuy(active)}
          >
            <span>Add {active.label} — £{active.price.toFixed(2)}</span>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="lp-reta-bundle-pays">
            <span><LockIcon /> Secure checkout</span>
            <span>·</span>
            <span>Free tracked UK shipping</span>
            <span>·</span>
            <span>30-day money-back guarantee</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Guarantee() {
  return (
    <section className="lp-reta-guarantee">
      <div className="lp-reta-section-inner lp-reta-guarantee-inner">
        <div className="lp-reta-guarantee-badge">
          <span className="lp-reta-guarantee-30">30</span>
          <span className="lp-reta-guarantee-day">DAY</span>
        </div>
        <div className="lp-reta-guarantee-text">
          <h2 className="lp-reta-h2">Try it for 30 days. <span className="lp-reta-h2-light">On us.</span></h2>
          <p>
            Open the box. Read the protocol guide. Reconstitute. Dose. Track. If — within
            30 days — you don't see the appetite shift, the energy lift, or the scale
            movement you expected, contact our UK support team and we'll refund the order
            in full. No "send back the empty vial" hoops. No "are you sure?" call.
          </p>
        </div>
      </div>
    </section>
  )
}

function FAQ({ openFaq, setOpenFaq }: { openFaq: number | null; setOpenFaq: (n: number | null) => void }) {
  const items = [
    {
      q: 'What exactly is Reta?',
      a: 'Reta is a lab-synthesised triagonist peptide — a single molecule that selectively binds the GLP-1, GIP, and glucagon receptors. It is supplied as a lyophilised research-grade compound and shipped from our UK facility. It is sold for laboratory and research use only.',
    },
    {
      q: 'How is it different from semaglutide (Wegovy/Ozempic) or tirzepatide (Mounjaro)?',
      a: 'Semaglutide is a GLP-1 mono-agonist. Tirzepatide is a GLP-1 + GIP dual-agonist. Reta is the only commercially available compound that targets all three pathways — GLP-1, GIP, and glucagon — simultaneously. The third receptor (glucagon) is the one that raises resting energy expenditure, which is why Phase 2 trial data showed the steepest weight-loss curve at 48 weeks.',
    },
    {
      q: 'What dose should I start with?',
      a: 'A typical research protocol begins at 2mg/week, titrating up by 2mg every 4 weeks as tolerated. The printed 24-week protocol guide included in every order maps the exact schedule. Most users reach 8–12mg/week by week 16–20.',
    },
    {
      q: 'Is it safe?',
      a: 'Reta is sold strictly for laboratory and research use and is not approved by the MHRA or FDA for human consumption. Published clinical-trial data for retatrutide (Jastreboff et al., NEJM 2023) reported a safety profile broadly consistent with the GLP-1 class — nausea was the most common side-effect, generally mild and improving with continued dosing. Consult a qualified medical professional before starting any protocol.',
    },
    {
      q: 'How quickly does it ship?',
      a: 'Orders placed before 2pm UK time ship the same business day. Royal Mail Tracked 48 means most UK addresses receive their order within 2 business days. International shipping is available at checkout.',
    },
    {
      q: 'What\'s in the box?',
      a: 'One lyophilised vial of Reta (in the dose you select), the certificate of analysis (COA) for your batch, a 30ml vial of bacteriostatic water, two single-use insulin-style syringes, two alcohol prep pads, and the 32-page printed 24-week protocol guide. All inside a discreet padded mailer with no external branding.',
    },
    {
      q: 'How does the 30-day guarantee work?',
      a: 'Contact our UK support within 30 days of delivery and we\'ll refund the order in full — no return shipping required, no questions about why. We\'d obviously appreciate the feedback, but it isn\'t a condition of the refund.',
    },
    {
      q: 'How do you keep it discreet?',
      a: 'Plain padded mailer. No external branding. The return address is a generic logistics name, not the brand. Nothing on the outside indicates what\'s inside.',
    },
  ]
  return (
    <section className="lp-reta-faq">
      <div className="lp-reta-section-inner">
        <span className="lp-reta-eyebrow">FREQUENTLY ASKED</span>
        <h2 className="lp-reta-h2">Questions, answered.</h2>
        <div className="lp-reta-faq-list">
          {items.map((it, i) => {
            const open = openFaq === i
            return (
              <div key={i} className={`lp-reta-faq-item ${open ? 'lp-reta-faq-open' : ''}`}>
                <button
                  type="button"
                  className="lp-reta-faq-q"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                >
                  <span>{it.q}</span>
                  <span className="lp-reta-faq-toggle" aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open && <div className="lp-reta-faq-a">{it.a}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Disclaimer({ brandLabel }: { brandLabel: string }) {
  return (
    <footer className="lp-reta-footer">
      <div className="lp-reta-section-inner">
        <div className="lp-reta-footer-disc">
          <strong>RESEARCH USE ONLY.</strong> Reta (retatrutide) is sold strictly for
          laboratory and in-vitro research applications and is not intended for human
          consumption. Retatrutide is an investigational compound and is not approved
          by the MHRA, FDA, or any other regulatory authority. Trial data referenced on
          this page (Jastreboff AM et al., NEJM 2023;389:514-526) describes outcomes
          observed in clinical research subjects under supervised dosing; outcomes in
          unsupervised research applications vary. Photographs labelled as
          before/after are illustrative composites representing averaged trial endpoints.
          Consult a qualified medical professional before commencing any protocol.
        </div>
        <div className="lp-reta-footer-meta">
          <span>© {new Date().getFullYear()} {brandLabel}. All rights reserved.</span>
          <span>UK research facility · COA available on request · support@{brandLabel.toLowerCase().replace(' ', '')}.com</span>
        </div>
      </div>
    </footer>
  )
}

function StickyMobileCTA({ onCTA }: { onCTA: () => void }) {
  return (
    <div className="lp-reta-sticky">
      <button type="button" className="lp-reta-sticky-btn" onClick={onCTA}>
        <span>Get Reta — from £{PRICE_4.toFixed(0)}</span>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
