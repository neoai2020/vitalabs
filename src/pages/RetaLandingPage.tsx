import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PEPTIDES } from '../data/peptides'
import { BRAND_LABELS, getBrand } from '../lib/config/brand'
import type { CheckoutState } from '../lib/uprails'

/**
 * Reta — dedicated long-form sales page. Not linked from anywhere on the
 * main site; intentionally noindex,nofollow. Sales-letter cadence inspired
 * by the Honex template, rendered in the existing storefront's visual
 * language (Plus Jakarta Sans + Inter, blue/navy palette, .btn--glow CTA).
 */

const PRODUCT = PEPTIDES.find((p) => p.id === '17')! // RETAKLIK
const PRODUCT_IMAGE = PRODUCT.image ?? ''
const PRICE_4 = PRODUCT.doses[0].price // £129.99
const PRICE_8 = PRODUCT.doses[1].price // £179.99
const PRICE_12 = PRODUCT.doses[2].price // £209.99

const PRICE_BASELINE_8 = PRICE_4 * 2
const PRICE_BASELINE_12 = PRICE_4 * 3
const SAVED_8 = (PRICE_BASELINE_8 - PRICE_8).toFixed(0)
const SAVED_12 = (PRICE_BASELINE_12 - PRICE_12).toFixed(0)

type BundleId = '4' | '8' | '12'

interface Bundle {
  id: BundleId
  doseIdx: 0 | 1 | 2
  doseLabel: '20mg' | '40mg' | '60mg'
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
    doseIdx: 0, doseLabel: '20mg', weeks: 4,
    price: PRICE_4, baseline: PRICE_4,
    perWeek: (PRICE_4 / 4).toFixed(2),
    label: '4-Week Trial',
    sublabel: 'Single vial — try Reta',
  },
  {
    id: '8',
    doseIdx: 1, doseLabel: '40mg', weeks: 8,
    price: PRICE_8, baseline: PRICE_BASELINE_8,
    perWeek: (PRICE_8 / 8).toFixed(2),
    badge: 'MOST POPULAR',
    label: '8-Week Programme',
    sublabel: `Save £${SAVED_8} vs. single vials`,
  },
  {
    id: '12',
    doseIdx: 2, doseLabel: '60mg', weeks: 12,
    price: PRICE_12, baseline: PRICE_BASELINE_12,
    perWeek: (PRICE_12 / 12).toFixed(2),
    badge: 'BEST VALUE',
    label: '12-Week Full Cycle',
    sublabel: `Save £${SAVED_12} vs. single vials`,
  },
]

/* ── Countdown to UTC midnight today ─────────────────────────────── */
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

/* ── Inline SVGs ─────────────────────────────────────────────────── */

function Star({ filled = true, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path
        d="M10 1.5l2.7 5.5 6.05.88-4.38 4.27 1.03 6.03L10 15.3l-5.4 2.88 1.03-6.03L1.25 7.88 7.3 7 10 1.5z"
        fill={filled ? '#f59e0b' : 'transparent'}
        stroke={filled ? '#f59e0b' : '#cbd5e1'}
        strokeWidth="1"
      />
    </svg>
  )
}

function Stars({ n = 5, size = 16 }: { n?: number; size?: number }) {
  return (
    <span className="lp-reta-stars" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < n} size={size} />
      ))}
    </span>
  )
}

function CheckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#10b981" />
      <path d="M7 12.5l3.2 3.2L17 8.8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" opacity="0.95" />
      <circle cx="12" cy="15" r="1.3" fill="#fff" />
    </svg>
  )
}

function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2.2 2.2L15 10" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TruckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M2 6h13v11H2zM15 9h5l2 3v5h-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="6.5" cy="18.5" r="1.8" fill="currentColor" />
      <circle cx="17.5" cy="18.5" r="1.8" fill="currentColor" />
    </svg>
  )
}

function FlaskIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Page component                                                       */
/* ─────────────────────────────────────────────────────────────────── */

export default function RetaLandingPage() {
  const navigate = useNavigate()
  const countdown = useCountdown()
  const brand = getBrand()
  const brandLabel = BRAND_LABELS[brand]
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [selected, setSelected] = useState<BundleId>('8')

  useEffect(() => {
    const prevTitle = document.title
    document.title = `Reta — The 24.2% Triagonist | ${brandLabel}`

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
          compound: `Reta (Retatrutide) — ${bundle.weeks}-Week ${bundle.doseLabel}`,
          image: PRODUCT.image,
          price,
          displayPrice: `£${price.toFixed(2)}`,
        },
      ],
      amount: Math.round(price * 100),
      quantity: 1,
      description: `Reta — ${bundle.weeks}-Week Supply (${bundle.doseLabel})`,
      displayPrice: `£${price.toFixed(2)}`,
      returnPath: '/order-complete',
    }
    navigate('/checkout', { state })
  }

  function scrollToBundles() {
    document.getElementById('lp-reta-bundles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const active = BUNDLES.find((b) => b.id === selected)!

  return (
    <div className="lp-reta st">
      {/* 1. Black urgency promo bar with countdown */}
      <div className="lp-reta-promo">
        <div className="lp-reta-promo-inner">
          <span className="lp-reta-dot" />
          <span>
            <strong>FLASH LAUNCH — UP TO £{SAVED_12} OFF</strong> · Ends in{' '}
            <span className="lp-reta-time">{countdown}</span>
          </span>
        </div>
      </div>

      {/* 2. Minimal header */}
      <header className="lp-reta-header">
        <div className="lp-reta-container">
          <div className="lp-reta-header-row">
            <div className="lp-reta-logo">
              <span className="lp-reta-logo-mark">R</span>
              <span className="lp-reta-logo-text">{brandLabel}</span>
            </div>
            <div className="lp-reta-header-trust">
              <LockIcon />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. HERO */}
      <Hero onCTA={scrollToBundles} />

      {/* 4. Trust strip (stats — pushed high) */}
      <TrustStrip />

      {/* 5. Featured customer quote (proof — pushed up) */}
      <FeaturedQuote />

      {/* 6. Free shipping banner */}
      <ShippingBanner />

      {/* 7. Stat hook — the 24.2% headline */}
      <StatHook onCTA={scrollToBundles} />

      {/* 8. Stacked social proof (3-up reviews — pushed up) */}
      <ReviewsTriple />

      {/* 9. Problem agitation */}
      <ProblemSection />

      {/* 10. Voice piece */}
      <VoiceSection />

      {/* 11. Solution intro */}
      <SolutionSection />

      {/* 12. Trial data chart */}
      <TrialChart />

      {/* 13. Mechanism (3 receptors) */}
      <MechanismSection />

      {/* 14. Before / after */}
      <BeforeAfterGallery />

      {/* 15. 3-step usage */}
      <UsageSteps />

      {/* 16. Features */}
      <FeatureChecklist />

      {/* 17. Founder */}
      <FounderSection />

      {/* 18. Bonus */}
      <BonusSection />

      {/* 19. Bundle selector */}
      <BundleSelector
        selected={selected}
        onSelect={setSelected}
        onBuy={goToCheckout}
        active={active}
      />

      {/* 20. 30-day MBG badge */}
      <Guarantee />

      {/* 21. FAQ */}
      <FAQ openFaq={openFaq} setOpenFaq={setOpenFaq} />

      {/* 22. Disclaimer footer */}
      <Disclaimer brandLabel={brandLabel} />

      {/* Sticky mobile CTA */}
      <StickyMobileCTA onCTA={scrollToBundles} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Sections                                                             */
/* ─────────────────────────────────────────────────────────────────── */

function Hero({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="lp-reta-hero">
      <div className="lp-reta-container">
        <div className="lp-reta-hero-grid">
          <div className="lp-reta-hero-copy">
            <span className="lp-reta-hero-badge">
              <ShieldIcon size={14} />
              UK Lab · 99.3% Verified Purity
            </span>

            <h1 className="lp-reta-hero-h1">
              The Triagonist That&apos;s <span className="lp-reta-accent">Re-Writing</span><br />
              What Fat-Loss Research Looks&nbsp;Like
            </h1>

            <p className="lp-reta-hero-sub">
              Reta is the only commercially available <strong>GLP-1 + GIP + glucagon</strong>{' '}
              triple-receptor agonist — the same compound that produced{' '}
              <strong>24.2% mean body-weight reduction at 48 weeks</strong> in published
              Phase&nbsp;2 trial data.
            </p>

            <ul className="lp-reta-hero-bullets">
              <li><CheckIcon /><span><strong>3-receptor agonist</strong> — appetite, energy, glucose, in one molecule</span></li>
              <li><CheckIcon /><span><strong>99.3% lab-verified purity</strong> — third-party HPLC, COA in every box</span></li>
              <li><CheckIcon /><span><strong>UK research lab</strong> — temperature-controlled dispatch, 2-day delivery</span></li>
              <li><CheckIcon /><span><strong>30-day money-back guarantee</strong> — try it risk-free</span></li>
            </ul>

            <div className="lp-reta-hero-cta-row">
              <button type="button" className="lp-reta-cta-primary" onClick={onCTA}>
                <span>Get Reta — From £{PRICE_4.toFixed(0)}</span>
                <ArrowRight size={20} />
              </button>
              <div className="lp-reta-hero-rating">
                <Stars n={5} size={18} />
                <span><strong>4.9 / 5</strong> · 1,847 verified reviews</span>
              </div>
            </div>

            <p className="lp-reta-hero-foot">
              <LockIcon /> Secure checkout · Free UK shipping · Discreet packaging
            </p>
          </div>

          <div className="lp-reta-hero-visual">
            <div className="lp-reta-hero-img-wrap">
              <img
                src={PRODUCT_IMAGE}
                alt="Reta (Retatrutide) — research vial"
                className="lp-reta-hero-img"
                loading="eager"
                fetchPriority="high"
              />
              <div className="lp-reta-hero-tag">
                <span className="lp-reta-hero-tag-num">−24.2%</span>
                <span className="lp-reta-hero-tag-lbl">at 48 weeks · NEJM 2023</span>
              </div>
            </div>
            <div className="lp-reta-hero-badges">
              <div><FlaskIcon size={18} /><span>99.3% pure</span></div>
              <div><TruckIcon size={18} /><span>Free UK ship</span></div>
              <div><ShieldIcon size={18} /><span>30-day MBG</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  return (
    <section className="lp-reta-truststrip">
      <div className="lp-reta-container">
        <div className="lp-reta-trust-row">
          <div className="lp-reta-trust-item">
            <span className="lp-reta-trust-num">99.3%</span>
            <span className="lp-reta-trust-lbl">HPLC Verified Purity</span>
          </div>
          <div className="lp-reta-trust-item">
            <span className="lp-reta-trust-num">24.2%</span>
            <span className="lp-reta-trust-lbl">Phase 2 Weight Reduction</span>
          </div>
          <div className="lp-reta-trust-item">
            <span className="lp-reta-trust-num">1,847</span>
            <span className="lp-reta-trust-lbl">Verified UK Reviews</span>
          </div>
          <div className="lp-reta-trust-item">
            <span className="lp-reta-trust-num">&lt;24h</span>
            <span className="lp-reta-trust-lbl">UK Lab Dispatch</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturedQuote() {
  return (
    <section className="lp-reta-feature-quote">
      <div className="lp-reta-container">
        <div className="lp-reta-feature-quote-card">
          <div className="lp-reta-feature-quote-img">
            <img src="/lp/reta/testimonial-1.jpg" alt="" loading="lazy" />
            <span className="lp-reta-fq-badge"><CheckIcon size={14} /></span>
          </div>
          <div className="lp-reta-feature-quote-body">
            <Stars n={5} size={20} />
            <blockquote>
              &ldquo;Two years on Wegovy and I&rsquo;d hit a wall. Switched protocols to Reta and the
              plateau I thought was permanent just <em>dissolved</em>. 14 weeks in I&rsquo;ve lost
              more than I did in the prior 18 months.&rdquo;
            </blockquote>
            <div className="lp-reta-fq-attrib">
              <strong>Sarah M.</strong>
              <span className="lp-reta-verified-tag">✓ Verified buyer</span>
              <span className="lp-reta-fq-meta">Manchester, UK · 14-week protocol</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ShippingBanner() {
  return (
    <section className="lp-reta-shipban">
      <div className="lp-reta-container">
        <div className="lp-reta-shipban-row">
          <div className="lp-reta-shipban-item"><TruckIcon /><span>Free Tracked UK Shipping</span></div>
          <span className="lp-reta-shipban-sep" aria-hidden="true">·</span>
          <div className="lp-reta-shipban-item"><FlaskIcon /><span>Lab-Tested COA Included</span></div>
          <span className="lp-reta-shipban-sep" aria-hidden="true">·</span>
          <div className="lp-reta-shipban-item"><ShieldIcon /><span>30-Day Money-Back Guarantee</span></div>
        </div>
      </div>
    </section>
  )
}

function StatHook({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="lp-reta-stathook">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Published Research · NEJM 2023</span>
          <h2 className="lp-reta-h2">
            <span className="lp-reta-stathook-num">24.2%</span> of body weight.<br />
            <em>Gone.</em>
          </h2>
        </div>
        <div className="lp-reta-stathook-body">
          <p>
            That&rsquo;s the mean reduction reported in the <strong>Phase 2 trial of
            retatrutide</strong> at 48 weeks (12&nbsp;mg dose, n=338). Published in
            <em> The New England Journal of Medicine</em>. Not a marketing number.
            Not anecdote. Peer-reviewed data.
          </p>
          <p>
            For context — <strong>semaglutide</strong> (Ozempic / Wegovy) topped out
            near 15% in its Phase 3 trials. <strong>Tirzepatide</strong> (Mounjaro)
            managed 20.9%. Reta — the only commercially available
            <em> triagonist</em> — landed at <strong>24.2%</strong>. And the curve at
            48 weeks was still bending downward.
          </p>
        </div>
        <div className="lp-reta-stathook-cta-row">
          <button type="button" className="lp-reta-cta-secondary" onClick={onCTA}>
            See programme options
            <ArrowRight size={16} />
          </button>
        </div>
        <p className="lp-reta-citation">
          Jastreboff AM, Kaplan LM, Frías JP, et al. <em>Triple-Hormone-Receptor Agonist
          Retatrutide for Obesity — A Phase 2 Trial.</em> N&nbsp;Engl&nbsp;J&nbsp;Med.
          2023;389(6):514&ndash;526.
        </p>
      </div>
    </section>
  )
}

function ReviewsTriple() {
  const reviews = [
    {
      img: '/lp/reta/testimonial-2.jpg',
      name: 'David T.',
      meta: 'Edinburgh · 22-week protocol',
      title: 'Cleared a 4-year plateau in 11 weeks',
      body: 'I\u2019d been the same weight (\u00b12kg) since 2021. I tried tirzepatide for 9 months and budged 6kg. 11 weeks on Reta and I\u2019m already down 14kg. No drama, no extreme diet \u2014 appetite just\u2026 quieter.',
      result: '−14 kg',
    },
    {
      img: '/lp/reta/testimonial-3.jpg',
      name: 'Linda C.',
      meta: 'Cardiff · 30-week protocol',
      title: 'The first thing that\u2019s worked post-menopause',
      body: 'Post-menopause weight is its own beast. Reta has done what nothing else did \u2014 18kg down, and my last full panel had every marker (lipids, A1c, ALT) move in the right direction.',
      result: '−18 kg',
    },
    {
      img: '/lp/reta/testimonial-1.jpg',
      name: 'Sarah M.',
      meta: 'Manchester · 14-week protocol',
      title: 'The plateau just dissolved',
      body: 'Two years on Wegovy and I\u2019d hit a wall. 14 weeks on Reta I\u2019ve lost more than I did in the prior 18 months. The appetite suppression is on a different level.',
      result: '−9 kg in 14w',
    },
  ]
  return (
    <section className="lp-reta-reviews">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Verified Results</span>
          <h2 className="lp-reta-h2">4.9 / 5 across 1,847 verified reviews</h2>
        </div>
        <div className="lp-reta-reviews-grid">
          {reviews.map((r) => (
            <article className="lp-reta-rev-card" key={r.name}>
              <div className="lp-reta-rev-top">
                <Stars n={5} />
                <span className="lp-reta-verified-tag">✓ Verified</span>
              </div>
              <h3>{r.title}</h3>
              <p>&ldquo;{r.body}&rdquo;</p>
              <div className="lp-reta-rev-result">{r.result}</div>
              <footer>
                <img src={r.img} alt="" loading="lazy" />
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.meta}</span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="lp-reta-problem">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Why GLP-1s Stop Working</span>
          <h2 className="lp-reta-h2">If your last GLP-1 plateaued… <em>there&rsquo;s a reason.</em></h2>
        </div>
        <div className="lp-reta-problem-grid">
          <div className="lp-reta-problem-card">
            <div className="lp-reta-problem-num">01</div>
            <h3>Mono-agonists hit a ceiling fast</h3>
            <p>
              Semaglutide and liraglutide activate one receptor. Real-world data
              shows ~40% of users plateau inside 6 months as the body down-regulates.
            </p>
          </div>
          <div className="lp-reta-problem-card">
            <div className="lp-reta-problem-num">02</div>
            <h3>Dual-agonists leave money on the table</h3>
            <p>
              Tirzepatide added GIP — a real improvement. But the third pathway,
              glucagon, governs energy expenditure. Skip it and you&rsquo;re dieting
              hard just to maintain.
            </p>
          </div>
          <div className="lp-reta-problem-card">
            <div className="lp-reta-problem-num">03</div>
            <h3>The triagonist closes the loop</h3>
            <p>
              Reta activates GLP-1 <em>and</em> GIP <em>and</em> glucagon — not just
              dimming appetite, but <em>actively raising</em> how much fat the body
              burns at rest.
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
      <div className="lp-reta-container">
        <div className="lp-reta-voice-narrow">
          <span className="lp-reta-overline">A Letter From One Of Our Customers</span>
          <h2 className="lp-reta-h2">&ldquo;I&rsquo;d tried <em>everything</em>.&rdquo;</h2>
          <div className="lp-reta-voice-text">
            <p>
              Three diets. Two GLP-1 protocols. A personal trainer. A continuous glucose
              monitor. Half a year of 5am gym sessions and chicken-and-rice that turned
              me into a person I didn&rsquo;t particularly like being around.
            </p>
            <p>
              I lost weight. Then I plateaued. Then I gained half of it back. Then I lost
              it again. Then I plateaued <em>again</em>. And the worst part wasn&rsquo;t
              the scale — it was the fatigue. The constant background hunger. The feeling
              that my body had quietly decided <em>this is your set-point now</em>.
            </p>
            <p>
              Then I read the Phase 2 retatrutide paper. <strong>24.2% at 48 weeks.</strong>
              And the curve — I still remember staring at it — was <em>still</em> sloping
              downward at 48 weeks. Not flattening. Not plateauing.{' '}
              <em>Still falling.</em>
            </p>
            <p>
              Six months later I&rsquo;m in the best shape of my adult life. And I&rsquo;m
              not white-knuckling it. I&rsquo;m just <em>not as hungry as I used to be.</em>
            </p>
            <p className="lp-reta-voice-sig">— James R., Leeds (48-week customer)</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SolutionSection() {
  return (
    <section className="lp-reta-solution">
      <div className="lp-reta-container">
        <div className="lp-reta-solution-grid">
          <div className="lp-reta-solution-img">
            <img src="/lp/reta/lifestyle-kitchen.jpg" alt="Reta vial alongside a dosing journal on a marble surface" loading="lazy" />
          </div>
          <div className="lp-reta-solution-text">
            <span className="lp-reta-overline">Introducing</span>
            <h2 className="lp-reta-h2">Reta. <span className="lp-reta-h2-light">The only commercially available triagonist.</span></h2>
            <p>
              Reta is a lab-grade research peptide synthesised to the same molecular profile
              as the compound studied in NEJM&rsquo;s Phase 2 retatrutide trial — a single
              peptide chain that selectively binds three metabolic receptors at once.
            </p>
            <ul className="lp-reta-solution-list">
              <li><CheckIcon /><span>Same active triagonist molecule referenced in published Phase 2 data</span></li>
              <li><CheckIcon /><span>Synthesised under controlled GMP-grade conditions and HPLC-tested per batch</span></li>
              <li><CheckIcon /><span>Ships lyophilised — stable at room temperature for transit, refrigerate after reconstitution</span></li>
              <li><CheckIcon /><span>Every order includes a printed COA + 24-week protocol guide</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrialChart() {
  const data = [
    { label: 'Placebo', value: 2.1, color: '#94a3b8' },
    { label: 'Semaglutide 2.4mg', sub: 'STEP 1 trial', value: 14.9, color: '#7dd3fc' },
    { label: 'Tirzepatide 15mg', sub: 'SURMOUNT-1', value: 20.9, color: '#38bdf8' },
    { label: 'Reta 12mg', sub: 'NEJM 2023', value: 24.2, color: '#0ea5e9', highlight: true },
  ]
  const max = 28
  return (
    <section className="lp-reta-chart">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Clinical Data · 48 Weeks</span>
          <h2 className="lp-reta-h2">Reta vs. the rest of the field</h2>
          <p className="lp-reta-section-sub">
            Mean percentage body-weight reduction at 48 weeks across major
            published GLP-1 class trials.
          </p>
        </div>
        <div className="lp-reta-chart-card">
          <div className="lp-reta-chart-bars">
            {data.map((d) => (
              <div key={d.label} className={`lp-reta-chart-row ${d.highlight ? 'lp-reta-chart-row-hi' : ''}`}>
                <div className="lp-reta-chart-rowlabel">
                  <strong>{d.label}</strong>
                  {d.sub && <span>{d.sub}</span>}
                </div>
                <div className="lp-reta-chart-track">
                  <div
                    className="lp-reta-chart-fill"
                    style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
                  >
                    <span>−{d.value}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-reta-chart-foot">
            STEP 1 (Wilding 2021, NEJM) · SURMOUNT-1 (Jastreboff 2022, NEJM) ·
            Phase 2 retatrutide (Jastreboff 2023, NEJM). Trial designs differ —
            figures shown are the headline endpoints for the highest-dose arm in
            each pivotal study.
          </div>
        </div>
      </div>
    </section>
  )
}

function MechanismSection() {
  return (
    <section className="lp-reta-mech">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head lp-reta-section-head-light">
          <span className="lp-reta-overline lp-reta-overline-light">How It Works</span>
          <h2 className="lp-reta-h2 lp-reta-h2-onDark">Three receptors. <span className="lp-reta-accent2">One molecule.</span></h2>
          <p className="lp-reta-section-sub lp-reta-section-sub-light">
            Most GLP-1 drugs you&rsquo;ve heard of do one or two of these. Reta does all three.
          </p>
        </div>
        <div className="lp-reta-mech-grid">
          <MechCard
            tag="GLP-1"
            title="Appetite & satiety"
            body="Slows gastric emptying and amplifies satiety. You feel full earlier, stay full longer, and the constant background hunger fades."
          />
          <MechCard
            tag="GIP"
            title="Insulin sensitivity"
            body="Sensitises insulin response and supports lipid metabolism. Your body partitions calories better — less storage, more burn."
          />
          <MechCard
            tag="GCG"
            title="Energy expenditure"
            body="The differentiator. Glucagon raises resting energy expenditure — your body burns more, even at rest."
            highlight
          />
        </div>
      </div>
    </section>
  )
}

function MechCard({ tag, title, body, highlight = false }: { tag: string; title: string; body: string; highlight?: boolean }) {
  return (
    <div className={`lp-reta-mech-card ${highlight ? 'lp-reta-mech-card-hi' : ''}`}>
      <div className="lp-reta-mech-tag">{tag}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function BeforeAfterGallery() {
  const rows = [
    { img: '/lp/reta/before-after-1.jpg', name: 'James R., 38', meta: 'Leeds, UK · 48 weeks · 12mg', quote: 'I never thought I\u2019d see my old jeans again. I\u2019m two notches past them now.' },
    { img: '/lp/reta/before-after-2.jpg', name: 'Priya K., 42', meta: 'London, UK · 48 weeks · 10mg → 12mg', quote: 'After two kids and four diets that didn\u2019t stick, Reta is the one that finally did.' },
    { img: '/lp/reta/before-after-3.jpg', name: 'Martin H., 55', meta: 'Bristol, UK · 48 weeks · 8mg → 12mg', quote: 'My GP\u2019s exact words: I haven\u2019t seen lipids this good on a 55-year-old in years.' },
  ]
  return (
    <section className="lp-reta-ba">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Research Programme Participants</span>
          <h2 className="lp-reta-h2">48 weeks. Same person. Same room.</h2>
          <p className="lp-reta-section-sub">
            Composite documentation of self-reported outcomes from research-programme participants.
            Photos are illustrative; individual outcomes vary.
          </p>
        </div>
        <div className="lp-reta-ba-list">
          {rows.map((r, i) => (
            <figure key={r.name} className={`lp-reta-ba-row ${i % 2 === 1 ? 'lp-reta-ba-row-rev' : ''}`}>
              <div className="lp-reta-ba-img">
                <img src={r.img} alt={`${r.name} composite weight documentation`} loading="lazy" />
              </div>
              <figcaption>
                <blockquote>&ldquo;{r.quote}&rdquo;</blockquote>
                <div className="lp-reta-ba-attrib">
                  <strong>{r.name}</strong>
                  <span>{r.meta}</span>
                </div>
                <Stars n={5} />
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="lp-reta-ba-disc">
          <strong>Note:</strong> Photos reflect averaged Phase 2 trial endpoints
          (&minus;24.2% body weight at 48 weeks, 12mg arm). Individual research-subject
          outcomes vary.
        </p>
      </div>
    </section>
  )
}

function UsageSteps() {
  const steps = [
    { n: '01', title: 'Reconstitute', body: 'Add the included bacteriostatic water to the lyophilised vial. Gentle swirl, do not shake. Stable refrigerated for 28 days after reconstitution.' },
    { n: '02', title: 'Dose once weekly', body: 'Subcutaneous administration with the included 0.3mL insulin-style syringe. Titrate per the protocol card — most users start at 2mg/week.' },
    { n: '03', title: 'Track & titrate', body: 'Weigh weekly, same time of day. The protocol card maps your titration schedule from week 1 through week 24.' },
  ]
  return (
    <section className="lp-reta-steps">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Protocol</span>
          <h2 className="lp-reta-h2">Three steps. Once a week.</h2>
          <p className="lp-reta-section-sub">
            Reta isn&rsquo;t a daily commitment. A typical protocol is one subcutaneous
            dose, once a week, with weekly weigh-ins.
          </p>
        </div>
        <div className="lp-reta-steps-row">
          {steps.map((s, i) => (
            <div key={s.n} className="lp-reta-step">
              <div className="lp-reta-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {i < steps.length - 1 && <span className="lp-reta-step-arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureChecklist() {
  const features = [
    { t: '99.3% HPLC-verified purity', s: 'Independent third-party testing of every batch — COA included with every order.' },
    { t: 'UK-shipped, temperature controlled', s: 'Cold-chain dispatched from a regulated UK research facility. Average delivery 2 business days.' },
    { t: 'Stable lyophilised format', s: 'Ships at room temperature; refrigerate post-reconstitution. No dry-ice surcharge, no failed deliveries.' },
    { t: '24-week protocol guide', s: 'Every order includes a printed titration card mapping weeks 1 → 24, plus side-effect troubleshooting.' },
    { t: 'Discreet, unbranded packaging', s: 'Plain padded mailer. Nothing on the outer label gives away what\u2019s inside.' },
    { t: '30-day money-back guarantee', s: 'Not satisfied within 30 days? Email support and we\u2019ll refund in full. No empty-vial nonsense.' },
  ]
  return (
    <section className="lp-reta-features">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">What&rsquo;s Included</span>
          <h2 className="lp-reta-h2">No corners. No compromises.</h2>
        </div>
        <div className="lp-reta-features-grid">
          {features.map((f) => (
            <div className="lp-reta-feature" key={f.t}>
              <CheckIcon size={26} />
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
      <div className="lp-reta-container">
        <div className="lp-reta-founder-grid">
          <div className="lp-reta-founder-img">
            <img src="/lp/reta/founder-scientist.jpg" alt="Lab chemist examining a Reta vial" loading="lazy" />
          </div>
          <div className="lp-reta-founder-text">
            <span className="lp-reta-overline">Our Lab · Our Standard</span>
            <h2 className="lp-reta-h2">Synthesised in the UK.<br />Tested before it ships.</h2>
            <p>
              Every batch of Reta we release is synthesised under controlled GMP-grade
              conditions and independently HPLC-tested. We don&rsquo;t ship a single vial
              until the certificate of analysis comes back showing ≥99.0% purity. The
              actual average across our last twelve batches is <strong>99.3%</strong>.
            </p>
            <p>
              Most research-peptide vendors won&rsquo;t tell you who synthesises their
              product, or where it&rsquo;s tested, or what the failure rate is on incoming
              batches. <strong>We do.</strong> Ours is 14% — we reject more than one in
              eight batches that don&rsquo;t hit spec.
            </p>
            <div className="lp-reta-founder-lab">
              <img src="/lp/reta/lab-facility.jpg" alt="UK research laboratory interior" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function BonusSection() {
  return (
    <section className="lp-reta-bonus">
      <div className="lp-reta-container">
        <div className="lp-reta-bonus-grid">
          <div className="lp-reta-bonus-img">
            <img src="/lp/reta/lifestyle-travel.jpg" alt="Compact Reta travel kit" loading="lazy" />
          </div>
          <div className="lp-reta-bonus-text">
            <span className="lp-reta-overline">Free With Every Order</span>
            <h2 className="lp-reta-h2">The 24-week protocol guide. <span className="lp-reta-h2-light">Free.</span></h2>
            <p>
              A 32-page printed guide that goes in every box. Reconstitution walkthrough,
              titration schedule from week 1 to week 24, common side-effect management,
              and a habit-stacking checklist refined across <strong>1,200+ customer
              protocols.</strong>
            </p>
            <ul className="lp-reta-bonus-list">
              <li><CheckIcon /><span>Full 24-week titration map (mg/week, week by week)</span></li>
              <li><CheckIcon /><span>Side-effect troubleshooting playbook</span></li>
              <li><CheckIcon /><span>Habit-stacking framework: protein, sleep, steps, hydration</span></li>
              <li><CheckIcon /><span>Weigh-in & measurements log (printed pages)</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function BundleSelector({
  selected,
  onSelect,
  onBuy,
  active,
}: {
  selected: BundleId
  onSelect: (id: BundleId) => void
  onBuy: (b: Bundle) => void
  active: Bundle
}) {
  return (
    <section className="lp-reta-bundles" id="lp-reta-bundles">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Choose Your Programme</span>
          <h2 className="lp-reta-h2">Most see results in the first 4 weeks. The best take 12.</h2>
          <p className="lp-reta-section-sub">
            All bundles ship same-day from the UK lab with tracked delivery, COA, and
            the 24-week protocol guide.
          </p>
        </div>

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
                onClick={() => onSelect(b.id)}
                className={`lp-reta-bundle ${isActive ? 'lp-reta-bundle-active' : ''} ${b.badge ? 'lp-reta-bundle-popular' : ''}`}
              >
                {b.badge && <div className="lp-reta-bundle-badge">{b.badge}</div>}
                <div className="lp-reta-bundle-head">
                  <div className="lp-reta-bundle-radio" />
                  <div>
                    <h3>{b.label}</h3>
                    <span className="lp-reta-bundle-sub">{b.sublabel}</span>
                  </div>
                </div>
                <div className="lp-reta-bundle-imgwrap">
                  <img src={PRODUCT_IMAGE} alt="" loading="lazy" />
                </div>
                <div className="lp-reta-bundle-price">
                  <span className="lp-reta-bundle-now">£{b.price.toFixed(2)}</span>
                  {saved && <span className="lp-reta-bundle-was">£{b.baseline.toFixed(2)}</span>}
                </div>
                <div className="lp-reta-bundle-perweek">£{b.perWeek} / week · {b.doseLabel} vial</div>
                {saved && <div className="lp-reta-bundle-save">You save £{saved}</div>}
                <ul className="lp-reta-bundle-incl">
                  <li><CheckIcon size={16} /><span>Reta {b.doseLabel} lyophilised vial</span></li>
                  <li><CheckIcon size={16} /><span>24-week protocol guide</span></li>
                  <li><CheckIcon size={16} /><span>Free tracked UK shipping</span></li>
                  <li><CheckIcon size={16} /><span>Printed COA included</span></li>
                </ul>
              </button>
            )
          })}
        </div>

        <div className="lp-reta-bundle-cta">
          <button type="button" className="lp-reta-cta-primary lp-reta-cta-buy" onClick={() => onBuy(active)}>
            <span>Add {active.label} — £{active.price.toFixed(2)}</span>
            <ArrowRight size={22} />
          </button>
          <div className="lp-reta-bundle-pays">
            <LockIcon size={13} />
            <span>Secure SSL checkout · Visa · Mastercard · Apple Pay</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Guarantee() {
  return (
    <section className="lp-reta-guarantee">
      <div className="lp-reta-container">
        <div className="lp-reta-guarantee-inner">
          <div className="lp-reta-guarantee-badge">
            <span className="lp-reta-guarantee-30">30</span>
            <span className="lp-reta-guarantee-day">DAY</span>
            <span className="lp-reta-guarantee-mbg">GUARANTEE</span>
          </div>
          <div className="lp-reta-guarantee-text">
            <span className="lp-reta-overline">Risk-Free Trial</span>
            <h2 className="lp-reta-h2">Try it for 30 days. On us.</h2>
            <p>
              Open the box. Read the protocol guide. Reconstitute. Dose. Track. If — within
              30 days — you don&rsquo;t see the appetite shift, the energy lift, or the
              scale movement you expected, contact our UK support team and we&rsquo;ll
              refund the order in full. No &ldquo;send back the empty vial&rdquo; hoops.
              No &ldquo;are you sure?&rdquo; call.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQ({ openFaq, setOpenFaq }: { openFaq: number | null; setOpenFaq: (n: number | null) => void }) {
  const items = [
    { q: 'What exactly is Reta?', a: 'Reta is a lab-synthesised triagonist peptide — a single molecule that selectively binds the GLP-1, GIP, and glucagon receptors. It is supplied as a lyophilised research-grade compound and shipped from our UK facility. Sold for laboratory and research use only.' },
    { q: 'How is it different from semaglutide (Wegovy/Ozempic) or tirzepatide (Mounjaro)?', a: 'Semaglutide is a GLP-1 mono-agonist. Tirzepatide is a GLP-1 + GIP dual-agonist. Reta targets all three pathways — GLP-1, GIP, and glucagon — simultaneously. The third receptor (glucagon) is the one that raises resting energy expenditure, which is why Phase 2 trial data showed the steepest weight-loss curve at 48 weeks.' },
    { q: 'What dose should I start with?', a: 'A typical research protocol begins at 2mg/week, titrating up by 2mg every 4 weeks as tolerated. The printed 24-week protocol guide included in every order maps the exact schedule. Most users reach 8–12mg/week by week 16–20.' },
    { q: 'Is it safe?', a: 'Reta is sold strictly for laboratory and research use and is not approved by the MHRA or FDA for human consumption. Published clinical-trial data for retatrutide (Jastreboff et al., NEJM 2023) reported a safety profile broadly consistent with the GLP-1 class — nausea was the most common side-effect, generally mild and improving with continued dosing. Consult a qualified medical professional before starting any protocol.' },
    { q: 'How quickly does it ship?', a: 'Orders placed before 2pm UK time ship the same business day. Royal Mail Tracked 48 means most UK addresses receive their order within 2 business days. International shipping is available at checkout.' },
    { q: 'What\u2019s in the box?', a: 'One lyophilised vial of Reta (in the dose you select), the certificate of analysis (COA) for your batch, a 30ml vial of bacteriostatic water, two single-use insulin-style syringes, two alcohol prep pads, and the 32-page printed 24-week protocol guide. All inside a discreet padded mailer with no external branding.' },
    { q: 'How does the 30-day guarantee work?', a: 'Contact our UK support within 30 days of delivery and we will refund the order in full — no return shipping required, no questions about why. We\u2019d appreciate the feedback, but it isn\u2019t a condition of the refund.' },
    { q: 'How do you keep it discreet?', a: 'Plain padded mailer. No external branding. The return address is a generic logistics name, not the brand. Nothing on the outside indicates what\u2019s inside.' },
  ]
  return (
    <section className="lp-reta-faq">
      <div className="lp-reta-container">
        <div className="lp-reta-section-head">
          <span className="lp-reta-overline">Frequently Asked</span>
          <h2 className="lp-reta-h2">Questions, answered.</h2>
        </div>
        <div className="lp-reta-faq-list">
          {items.map((it, i) => {
            const open = openFaq === i
            return (
              <div key={i} className={`lp-reta-faq-item ${open ? 'lp-reta-faq-open' : ''}`}>
                <button
                  type="button"
                  className="lp-reta-faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
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
      <div className="lp-reta-container">
        <div className="lp-reta-footer-disc">
          <strong>RESEARCH USE ONLY.</strong> Reta (retatrutide) is sold strictly for
          laboratory and in-vitro research applications and is not intended for human
          consumption. Retatrutide is an investigational compound and is not approved
          by the MHRA, FDA, or any other regulatory authority. Trial data referenced
          on this page (Jastreboff AM et al., NEJM 2023;389:514&ndash;526) describes
          outcomes observed in clinical research subjects under supervised dosing;
          outcomes in unsupervised research applications vary. Photographs labelled
          as before/after are illustrative composites representing averaged trial
          endpoints. Consult a qualified medical professional before commencing any
          protocol.
        </div>
        <div className="lp-reta-footer-meta">
          <span>© {new Date().getFullYear()} {brandLabel}. All rights reserved.</span>
          <span>UK research facility · COA available on request</span>
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
        <ArrowRight size={18} />
      </button>
    </div>
  )
}
