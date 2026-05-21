import { useState, useMemo } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { PEPTIDES, getPeptideById } from '../data/peptides'
import { getProductContent } from '../data/productContent'
import type { CheckoutState } from '../lib/uprails'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'
import { TrustpilotStrip } from '../components/TrustpilotBadge'

const CATEGORY_IMAGES: Record<string, string> = {
  'Weight management': '/images/weight-management-hero.png',
  'Strength & recovery': '/images/strength-recovery-hero.png',
  'Cellular repair & anti-aging': '/images/cellular-repair-hero.png',
}

const PRODUCT_REVIEWS: Record<string, { name: string; rating: number; text: string; date: string; result: string }[]> = {
  '17': [
    { name: 'James T.', rating: 5, text: 'Incredible results. Down 14kg in 8 weeks on the 40mg protocol. The triple mechanism really does hit different compared to Tirzepatide. Zero cravings from week 1.', date: '2 weeks ago', result: '-14kg in 8 weeks' },
    { name: 'Michael P.', rating: 5, text: 'Switched from Tirzepatide after a plateau. Broke through immediately and lost another 8kg. The 60mg dose is powerful — make sure you\'re ready for it.', date: '1 month ago', result: '-8kg (plateau broken)' },
    { name: 'Chris W.', rating: 4, text: 'Great product. Mild nausea first few days which settled by day 4. Weight coming off steadily at 1.5kg/week on 20mg.', date: '3 weeks ago', result: '-1.5kg per week' },
    { name: 'Andrew L.', rating: 5, text: 'Nothing else has worked like this. Tried keto, fasting, semaglutide. Reta addresses everything at once. 11kg down in 6 weeks.', date: '1 month ago', result: '-11kg in 6 weeks' },
  ],
  '2': [
    { name: 'Emma K.', rating: 5, text: 'Lost 9kg in the first month. Appetite just vanishes naturally — it doesn\'t feel forced. No side effects whatsoever.', date: '1 week ago', result: '-9kg in 4 weeks' },
    { name: 'Sarah L.', rating: 5, text: 'Started on 20mg, now on 40mg. Consistent 1-2kg loss per week. Energy levels actually improved too.', date: '2 weeks ago', result: '-12kg total' },
    { name: 'Rachel B.', rating: 4, text: 'Good results but took about 5 days to fully kick in. Now losing weight effortlessly. Food noise is gone.', date: '1 month ago', result: '-7kg so far' },
    { name: 'Jessica M.', rating: 5, text: 'As a woman who\'s struggled with weight my entire life, this has been life-changing. 8kg in 6 weeks.', date: '3 weeks ago', result: '-8kg in 6 weeks' },
  ],
  '20': [
    { name: 'David R.', rating: 5, text: 'Fixed my rotator cuff issue in 4 weeks. Physio couldn\'t manage it in 6 months. Can overhead press again pain-free.', date: '3 weeks ago', result: 'Full recovery' },
    { name: 'Tom H.', rating: 5, text: 'Running pain-free for the first time in 2 years. The BPC + TB combo targets everything simultaneously.', date: '1 month ago', result: 'Pain-free running' },
    { name: 'Alex M.', rating: 5, text: 'Patellar tendon issue resolved in under 3 weeks. Back to full squat depth with zero discomfort.', date: '2 weeks ago', result: 'Resolved in 3 weeks' },
  ],
  '8': [
    { name: 'Mark D.', rating: 5, text: 'Tennis elbow that plagued me for 8 months cleared up in 3 weeks. Tried cortisone, physio, everything. This fixed the underlying issue.', date: '2 weeks ago', result: 'Healed in 3 weeks' },
    { name: 'Pete S.', rating: 5, text: 'Incredible for gut issues. My IBS symptoms reduced by about 80% within the first month. Can eat normally again.', date: '1 month ago', result: 'IBS improved 80%' },
    { name: 'Ryan K.', rating: 4, text: 'Achilles tendinitis improving steadily. Consistent progress each week. Month 2 and almost pain-free.', date: '3 weeks ago', result: 'Near pain-free' },
  ],
  '7': [
    { name: 'Claire T.', rating: 5, text: 'The energy improvement is real and sustained. No more 3pm crashes. Skin looks better too. NAD+ is foundational.', date: '2 weeks ago', result: 'Energy restored' },
    { name: 'Simon G.', rating: 5, text: 'Brain fog completely gone within 2 weeks. Mentally sharp like my 20s. Sleep improved dramatically.', date: '1 month ago', result: 'Brain fog gone' },
    { name: 'Helen W.', rating: 4, text: 'Better energy and recovery. Took about 3 weeks to fully kick in but now I feel consistently younger.', date: '3 weeks ago', result: 'Rejuvenated' },
  ],
}

const DEFAULT_REVIEWS = [
  { name: 'Mark S.', rating: 5, text: 'Excellent quality. Fast shipping, professional packaging, and noticeable results within the expected timeframe.', date: '2 weeks ago', result: 'As expected' },
  { name: 'Lisa J.', rating: 5, text: 'Noticed effects within the first week. Purity is clearly top-notch — you can tell the difference.', date: '1 month ago', result: 'Visible results' },
  { name: 'Dan W.', rating: 4, text: 'Good product, does what it says. Certificate of analysis included, shipped next day.', date: '3 weeks ago', result: 'Positive' },
]

function BuyButton({ product, selectedDose, className }: { product: { sku: string; compound: string; image: string | null; doses: { label: string; price: number }[] }; selectedDose: number; className?: string }) {
  const navigate = useNavigate()
  const dose = product.doses[selectedDose]

  const handleBuy = () => {
    const checkoutState: CheckoutState = {
      items: [{
        sku: product.sku,
        compound: `${product.compound} — ${dose.label}`,
        image: product.image,
        price: dose.price,
        displayPrice: `£${dose.price.toFixed(2)}`,
      }],
      amount: Math.round(dose.price * 100),
      quantity: 1,
      description: `${product.compound} (${dose.label})`,
      displayPrice: `£${dose.price.toFixed(2)}`,
    }
    navigate('/checkout', { state: checkoutState })
  }

  return (
    <button type="button" onClick={handleBuy} className={className || 'btn btn--glow btn--lg'}>
      Buy Now — £{dose.price.toFixed(2)}
    </button>
  )
}

function DosageCalculator({ doses }: { doses: { label: string; mg: string; price: number }[] }) {
  const [weight, setWeight] = useState(80)
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [goal, setGoal] = useState<'moderate' | 'standard' | 'aggressive'>('standard')

  const recommendation = useMemo(() => {
    const hasMgDoses = doses.length > 1
    let doseIdx = 0
    let weeklyMg = ''
    let frequency = 'Once weekly subcutaneous injection'
    let duration = '8–12 weeks'
    let note = ''
    let mgPerKg = ''

    if (hasMgDoses) {
      // Multi-dose products: weight + experience + goal determine the dose tier
      let tierScore = 0
      if (experience === 'intermediate') tierScore += 1
      if (experience === 'advanced') tierScore += 2
      if (goal === 'aggressive') tierScore += 1
      if (weight > 100) tierScore += 1

      doseIdx = Math.min(tierScore, doses.length - 1)
      // cap beginner at first dose regardless
      if (experience === 'beginner') doseIdx = 0

      const selectedDose = doses[doseIdx]
      const mgNum = parseFloat(selectedDose.mg) || 0
      weeklyMg = selectedDose.label
      mgPerKg = mgNum > 0 ? `${(mgNum / weight).toFixed(2)} mg/kg` : '—'

      if (experience === 'beginner') {
        duration = '8–12 weeks'
        note = `Starting dose of ${selectedDose.label} recommended for your weight (${weight}kg). Begin here for 4 weeks to assess tolerance before considering an increase.`
      } else if (experience === 'intermediate') {
        duration = '12–16 weeks'
        note = `Based on your weight (${weight}kg) and experience, ${selectedDose.label} provides optimal efficacy. Monitor weekly and adjust if needed.`
      } else {
        duration = '16–20 weeks'
        note = `Advanced protocol: ${selectedDose.label} for ${weight}kg body weight. Ensure lower doses have been well-tolerated before starting here.`
      }
    } else {
      // Single-dose products
      const selectedDose = doses[0]
      weeklyMg = selectedDose?.label || 'Standard'
      const mgNum = parseFloat(selectedDose?.mg || '0') || 0
      mgPerKg = mgNum > 0 ? `${(mgNum / weight).toFixed(2)} mg/kg` : '—'

      if (experience === 'beginner') {
        duration = '8–12 weeks'
        frequency = 'Once weekly subcutaneous injection'
        note = `Standard protocol for ${weight}kg body weight. This is the recommended cycle for first-time users. Administer at the same time each week for consistent levels.`
      } else if (experience === 'intermediate') {
        duration = '12–16 weeks'
        frequency = goal === 'aggressive' ? '2x weekly subcutaneous injection' : 'Once weekly subcutaneous injection'
        note = `Extended protocol for experienced users at ${weight}kg. ${goal === 'aggressive' ? 'Split dosing (2x/week) may improve steady-state levels.' : 'Once weekly remains effective for most users.'}`
      } else {
        duration = '16–24 weeks'
        frequency = goal === 'aggressive' ? '2x weekly subcutaneous injection' : 'Once weekly subcutaneous injection'
        note = `Advanced protocol for ${weight}kg. ${goal === 'aggressive' ? 'Twice-weekly administration maintains higher steady-state concentration.' : 'Extended duration compensates for tolerance building.'}`
      }
    }

    return { dose: weeklyMg, frequency, duration, note, mgPerKg }
  }, [weight, experience, goal, doses])

  return (
    <div className="calc">
      <div className="calc-head">
        <h3 className="calc-h3">Personalised Dosage Calculator</h3>
        <p className="calc-intro">Adjust the inputs below and see your recommended protocol update in real-time.</p>
      </div>
      <div className="calc-body">
        <div className="calc-field">
          <label>Your Body Weight</label>
          <div className="calc-range">
            <input type="range" min={50} max={150} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
            <span className="calc-range-val">{weight} kg</span>
          </div>
        </div>
        <div className="calc-field">
          <label>Experience with Peptides</label>
          <div className="calc-opts">
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button key={lvl} type="button" className={`calc-opt ${experience === lvl ? 'calc-opt--active' : ''}`} onClick={() => setExperience(lvl)}>
                <strong>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</strong>
                <span>{lvl === 'beginner' ? 'No prior use' : lvl === 'intermediate' ? '1–12 months' : '12+ months'}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="calc-field">
          <label>Protocol Intensity</label>
          <div className="calc-opts">
            {(['moderate', 'standard', 'aggressive'] as const).map((g) => (
              <button key={g} type="button" className={`calc-opt ${goal === g ? 'calc-opt--active' : ''}`} onClick={() => setGoal(g)}>
                <strong>{g.charAt(0).toUpperCase() + g.slice(1)}</strong>
                <span>{g === 'moderate' ? 'Gentle start' : g === 'standard' ? 'Balanced' : 'Maximum effect'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="calc-result">
        <h4>Your Recommended Protocol</h4>
        <div className="calc-result-grid">
          <div className="calc-result-item"><span>Weekly Dose</span><strong>{recommendation.dose}</strong></div>
          <div className="calc-result-item"><span>Frequency</span><strong>{recommendation.frequency}</strong></div>
          <div className="calc-result-item"><span>Cycle Length</span><strong>{recommendation.duration}</strong></div>
          <div className="calc-result-item"><span>Dose/Weight Ratio</span><strong>{recommendation.mgPerKg}</strong></div>
        </div>
        <p className="calc-note">{recommendation.note}</p>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const product = id ? getPeptideById(id) : undefined
  if (!product) return <Navigate to="/products" replace />

  const [selectedDose, setSelectedDose] = useState(0)
  const reviews = PRODUCT_REVIEWS[product.id] || DEFAULT_REVIEWS
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
  const content = getProductContent(product.id)
  const categoryImg = CATEGORY_IMAGES[product.category] || '/images/cellular-repair-hero.png'

  const relatedProducts = PEPTIDES.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3)

  return (
    <div className="st">
      <SiteNav />

      {/* HERO SECTION */}
      <section className="pdp-hero">
        <div className="pdp-hero-inner">
          <div className="pdp-hero-left">
            <nav className="pdp-crumb">
              <Link to="/">Home</Link> / <Link to="/products">Products</Link> / <span>{product.compound}</span>
            </nav>
            <span className="pdp-hero-cat">{product.category}</span>
            <h1 className="pdp-hero-h1">{product.compound}</h1>
            <div className="pdp-hero-rating">
              <span className="gold-stars">★★★★★</span>
              <span>{avgRating} ({reviews.length} verified reviews)</span>
            </div>
            <p className="pdp-hero-desc">{product.description}</p>

            {product.doses.length > 1 && (
              <div className="pdp-hero-doses">
                {product.doses.map((d, i) => (
                  <button key={i} type="button" className={`pdp-hero-dose ${selectedDose === i ? 'pdp-hero-dose--active' : ''}`} onClick={() => setSelectedDose(i)}>
                    <strong>{d.label}</strong>
                    <span>£{d.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="pdp-hero-price">
              <span className="pdp-price-big">£{product.doses[selectedDose]?.price.toFixed(2)}</span>
              <span className="pdp-in-stock">✓ In Stock — Ships Today</span>
            </div>

            <div className="pdp-hero-btns">
              <BuyButton product={product} selectedDose={selectedDose} />
              <Link to="/quiz" className="btn btn--ghost">Not Sure? Take the Quiz</Link>
            </div>

            <div className="pdp-hero-trust">
              <span>🔒 Secure Payment</span>
              <span>🚚 Free UK Delivery</span>
              <span>📋 Protocol Guide Included</span>
              <span>↩️ 30-Day Guarantee</span>
            </div>
          </div>
          <div className="pdp-hero-right">
            {product.image ? (
              <img src={product.image} alt={product.compound} className="pdp-hero-img" />
            ) : (
              <div className="pdp-hero-img-placeholder" />
            )}
          </div>
        </div>
      </section>

      {/* TRUSTPILOT + SOCIAL PROOF — immediately after hero */}
      <section className="pdp-social-proof">
        <div className="st-container">
          <TrustpilotStrip />
          <div className="pdp-sp-row">
            {reviews.slice(0, 3).map((r, i) => (
              <div key={i} className="pdp-sp-card">
                <span className="gold-stars">{'★'.repeat(r.rating)}</span>
                <p>"{r.text.length > 120 ? r.text.slice(0, 120) + '...' : r.text}"</p>
                <div className="pdp-sp-meta">
                  <strong>{r.name}</strong>
                  <span className="pdp-sp-result">{r.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOSAGE CALCULATOR — high up for quick access */}
      <section className="section">
        <div className="st-container">
          <div className="section-head">
            <span className="overline">Protocol Builder</span>
            <h2 className="h2">Dosage Calculator</h2>
            <p className="section-sub">Get a personalised recommendation in seconds.</p>
          </div>
          <DosageCalculator doses={product.doses} />
          <div className="st-center" style={{ marginTop: '2rem' }}>
            <BuyButton product={product} selectedDose={selectedDose} className="btn btn--glow btn--lg" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — with illustration */}
      <section className="pdp-mechanism-section">
        <div className="st-container">
          <div className="pdp-mech-grid">
            <div className="pdp-mech-text">
              <span className="overline">Mechanism of Action</span>
              <h2 className="h2">How {product.sku} Works</h2>
              <p className="pdp-mech-desc">{content.howItWorks}</p>
              <div style={{ marginTop: '1.5rem' }}>
                <BuyButton product={product} selectedDose={selectedDose} className="btn btn--glow" />
              </div>
            </div>
            <div className="pdp-mech-img-wrap">
              <img src={categoryImg} alt="Mechanism" className="pdp-mech-img" />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="section section--dark">
        <div className="st-container">
          <div className="section-head section-head--light">
            <span className="overline overline--light">Key Benefits</span>
            <h2 className="h2 h2--light">What {product.sku} Delivers</h2>
            <p className="section-sub section-sub--light">Based on published research and verified customer outcomes.</p>
          </div>
          <div className="benefits-grid">
            {content.benefits.map((b, i) => (
              <div key={i} className="benefit-card">
                <span className="benefit-num">{String(i + 1).padStart(2, '0')}</span>
                <p className="benefit-text">{b}</p>
              </div>
            ))}
          </div>
          <div className="st-center" style={{ marginTop: '2.5rem' }}>
            <BuyButton product={product} selectedDose={selectedDose} className="btn btn--glow btn--lg" />
          </div>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="section">
        <div className="st-container">
          <div className="section-head">
            <span className="overline">Your Journey</span>
            <h2 className="h2">What to Expect</h2>
            <p className="section-sub">A realistic timeline based on typical user experiences and clinical data.</p>
          </div>
          <div className="timeline">
            {content.whatToExpect.map((w, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-left">
                  <span className="timeline-week">{w.week}</span>
                </div>
                <div className="timeline-mid">
                  <span className="timeline-dot" />
                  {i < content.whatToExpect.length - 1 && <span className="timeline-line" />}
                </div>
                <div className="timeline-right" data-week={w.week}>
                  <p className="timeline-desc">{w.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="st-center" style={{ marginTop: '2.5rem' }}>
            <BuyButton product={product} selectedDose={selectedDose} className="btn btn--glow btn--lg" />
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>Free UK shipping · Protocol guide included</p>
          </div>
        </div>
      </section>

      {/* IDEAL FOR */}
      <section className="section section--light-blue">
        <div className="st-container">
          <div className="section-head">
            <span className="overline">Who This Is For</span>
            <h2 className="h2">Ideal Candidates</h2>
          </div>
          <div className="ideal-grid">
            {content.idealFor.map((item, i) => (
              <div key={i} className="ideal-card">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FULL REVIEWS */}
      <section className="section section--dark">
        <div className="st-container">
          <div className="section-head section-head--light">
            <span className="overline overline--light">Social Proof</span>
            <h2 className="h2 h2--light">Verified Customer Results</h2>
            <div className="review-summary">
              <span className="review-summary-score">{avgRating}</span>
              <span className="gold-stars">★★★★★</span>
              <span className="review-summary-count">{reviews.length} verified reviews</span>
            </div>
          </div>
          <div className="pdp-reviews-grid">
            {reviews.map((r, i) => (
              <div key={i} className="pdp-review">
                <div className="pdp-review-top">
                  <span className="gold-stars">{'★'.repeat(r.rating)}</span>
                  <span className="pdp-review-verified">✓ Verified Purchase</span>
                </div>
                <p className="pdp-review-text">{r.text}</p>
                <div className="pdp-review-result">{r.result}</div>
                <div className="pdp-review-meta">
                  <strong>{r.name}</strong> · {r.date}
                </div>
              </div>
            ))}
          </div>
          <div className="st-center" style={{ marginTop: '2.5rem' }}>
            <BuyButton product={product} selectedDose={selectedDose} className="btn btn--glow btn--lg" />
          </div>
        </div>
      </section>

      {/* RELATED */}
      {relatedProducts.length > 0 && (
        <section className="section">
          <div className="st-container">
            <div className="section-head">
              <h2 className="h2">You May Also Like</h2>
            </div>
            <div className="st-products">
              {relatedProducts.map((p) => (
                <Link key={p.id} to={`/products/${p.id}`} className="st-prod-card">
                  {p.image && (<div className="st-prod-img-wrap"><img src={p.image} alt={p.compound} className="st-prod-img" /></div>)}
                  <div className="st-prod-body">
                    <span className="st-prod-cat">{p.category}</span>
                    <h3 className="st-prod-name">{p.compound}</h3>
                    <p className="st-prod-tag">{p.tagline}</p>
                    <div className="st-prod-foot">
                      <span className="st-prod-price">From £{p.doses[0]?.price.toFixed(2)}</span>
                      <span className="st-prod-link">View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM CTA */}
      <section className="section section--light-blue st-center">
        <div className="st-container">
          <h2 className="h2">Ready to Start Your Protocol?</h2>
          <p className="section-sub" style={{ marginBottom: '1.5rem' }}>Order now and receive your product with a complete dosing guide within 24 hours.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <BuyButton product={product} selectedDose={selectedDose} />
            <Link to="/quiz" className="btn btn--outline-dark">Take the Quiz Instead</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
