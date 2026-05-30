import { Link } from 'react-router-dom'
import { PEPTIDES } from '../data/peptides'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'
import { TrustpilotSection } from '../components/TrustpilotBadge'

const CATEGORIES = [
  {
    title: 'Weight Management',
    description: 'GLP-1, GIP & glucagon receptor agonists clinically shown to support sustainable fat loss, appetite regulation, and metabolic optimisation.',
    slug: 'weight-management',
    stat: '14kg average loss in 12 weeks',
    img: '/images/weight-management-hero.png',
  },
  {
    title: 'Strength & Recovery',
    description: 'Tissue-repair peptides studied for accelerating healing in tendons, ligaments, and muscle — reducing recovery timelines by up to 3x.',
    slug: 'strength-recovery',
    stat: '3x faster tissue repair observed',
    img: '/images/strength-recovery-hero.png',
  },
  {
    title: 'Cellular Repair & Anti-Aging',
    description: 'Regenerative compounds targeting mitochondrial function, collagen synthesis, and NAD+ restoration for measurable cellular rejuvenation.',
    slug: 'cellular-repair',
    stat: 'Visible results within 4 weeks',
    img: '/images/cellular-repair-hero.png',
  },
  {
    title: 'Growth Hormone Research',
    description: 'GHRH analogues and secretagogues researched for their effects on natural GH secretion, recovery, body composition, and anti-aging.',
    slug: 'growth-hormone',
    stat: 'Natural GH optimisation',
    img: '/images/cellular-repair-hero.png',
  },
  {
    title: 'Melanocortin Research',
    description: 'MSH analogs studied for their effects on melanocortin receptors and physiological pigmentation responses.',
    slug: 'melanocortin',
    stat: 'Receptor-targeted research',
    img: '/images/cellular-repair-hero.png',
  },
]

const STATS = [
  { value: '10,000+', label: 'UK Customers' },
  { value: '98.7%', label: 'Verified Purity' },
  { value: '4.9/5', label: 'Avg. Rating' },
  { value: '<24hr', label: 'Dispatch Time' },
]

const REVIEWS = [
  {
    name: 'James T.',
    rating: 5,
    text: 'Down 14kg in 8 weeks on Retatrutide. The personalised dosing guidance made all the difference — I knew exactly what to do from day one. Nothing else has come close to these results.',
    product: 'Retatrutide 40mg',
    result: '-14kg',
  },
  {
    name: 'Sarah M.',
    rating: 5,
    text: 'The Wolverine stack resolved my shoulder injury that two physios couldn\'t fix over 6 months. I\'m back to training pain-free for the first time in years.',
    product: 'Wolverine Stack',
    result: 'Pain-free',
  },
  {
    name: 'David R.',
    rating: 5,
    text: 'NAD+ eliminated my afternoon energy crashes completely. I feel genuinely 10 years younger. My skin has visibly improved too — people keep asking what I\'ve changed.',
    product: 'NAD+ 1000mg',
    result: 'Energy restored',
  },
  {
    name: 'Emma K.',
    rating: 5,
    text: 'Lost 9kg in the first month on Tirzepatide. Appetite just vanishes naturally — it doesn\'t feel forced at all. Vita Labs matched me perfectly.',
    product: 'Tirzepatide 20mg',
    result: '-9kg in 4 weeks',
  },
]

export default function LandingPage() {
  const featuredProducts = PEPTIDES.slice(0, 6)

  return (
    <div className="st">
      <SiteNav />

      {/* HERO — Full-width navy section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid">
            <div className="hero-text">
              <span className="hero-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Trusted by 10,000+ UK Customers
              </span>
              <h1 className="hero-h1">
                Where Research <br/>Meets <span className="hero-accent">Reliability</span>
              </h1>
              <p className="hero-sub">
                Pharmaceutical-grade peptides matched to your goals through our clinician-designed 
                protocol engine. Verified purity. Personalised dosing. Real results.
              </p>
              <div className="hero-btns">
                <Link to="/products" className="btn btn--glow">
                  Browse Products
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
              <p className="hero-note">Pharmaceutical-grade · Free UK shipping · Protocol guide included</p>
            </div>
            <div className="hero-visual">
              <img src="/images/hero-main.png" alt="Vita Labs" className="hero-img" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="stats-bar">
        <div className="st-container">
          <div className="stats-row">
            {STATS.map((s) => (
              <div key={s.label} className="stat-item">
                <span className="stat-val">{s.value}</span>
                <span className="stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUSTPILOT */}
      <TrustpilotSection />

      {/* CATEGORIES — with infographic images */}
      <section className="section">
        <div className="st-container">
          <div className="section-head">
            <span className="overline">Our Solutions</span>
            <h2 className="h2">Five Pillars of Health Optimisation</h2>
            <p className="section-sub">
              Each category contains rigorously tested compounds targeting specific biological pathways. 
              Select a category to explore.
            </p>
          </div>
          <div className="cats-list">
            {CATEGORIES.map((cat) => (
              <Link key={cat.slug} to={`/products?category=${cat.slug}`} className="cat-row">
                <div className="cat-img-wrap">
                  <img src={cat.img} alt={cat.title} className="cat-img" />
                </div>
                <div className="cat-info">
                  <span className="cat-stat">{cat.stat}</span>
                  <h3 className="cat-title">{cat.title}</h3>
                  <p className="cat-desc">{cat.description}</p>
                  <span className="cat-link">
                    Explore Products
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — dark section */}
      <section className="section section--dark">
        <div className="st-container">
          <div className="section-head section-head--light">
            <span className="overline overline--light">How It Works</span>
            <h2 className="h2 h2--light">From Order to Results in 4 Simple Steps</h2>
          </div>
          <div className="steps-row">
            <div className="step">
              <span className="step-num">01</span>
              <h3 className="step-title">Choose Your Product</h3>
              <p className="step-desc">Browse our catalogue and select the peptide matched to your goals. Use the dosage calculator for guidance.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <span className="step-num">02</span>
              <h3 className="step-title">Place Your Order</h3>
              <p className="step-desc">Secure checkout with fast processing. All orders ship within 24 hours in discreet packaging.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <span className="step-num">03</span>
              <h3 className="step-title">Receive Protocol</h3>
              <p className="step-desc">Product ships within 24h with a complete dosing guide and protocol timeline.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <span className="step-num">04</span>
              <h3 className="step-title">See Results</h3>
              <p className="step-desc">Follow your personalised protocol and track measurable progress week by week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="section">
        <div className="st-container">
          <div className="section-head">
            <span className="overline">Best Sellers</span>
            <h2 className="h2">Most Popular Products</h2>
            <p className="section-sub">Trusted by thousands for measurable, verifiable results.</p>
          </div>
          <div className="st-products">
            {featuredProducts.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="st-prod-card">
                {p.image && (
                  <div className="st-prod-img-wrap">
                    <img src={p.image} alt={p.compound} className="st-prod-img" />
                  </div>
                )}
                <div className="st-prod-body">
                  <span className="st-prod-cat">{p.category}</span>
                  <h3 className="st-prod-name">{p.compound}</h3>
                  <p className="st-prod-tag">{p.tagline}</p>
                  <div className="st-prod-foot">
                    <span className="st-prod-price">From £{p.doses[0]?.price.toFixed(2)}</span>
                    <span className="st-prod-link">View Details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="st-center" style={{ marginTop: '2.5rem' }}>
            <Link to="/products" className="btn btn--outline-dark">View All Products</Link>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section section--light-blue">
        <div className="st-container">
          <div className="section-head">
            <span className="overline">Verified Results</span>
            <h2 className="h2">What Our Customers Say</h2>
          </div>
          <div className="reviews-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-top">
                  <span className="review-stars">★★★★★</span>
                  <span className="review-verified">✓ Verified</span>
                </div>
                <p className="review-text">"{r.text}"</p>
                <div className="review-result">{r.result}</div>
                <div className="review-meta">
                  <strong>{r.name}</strong>
                  <span>{r.product}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--dark cta-section">
        <div className="st-container st-center">
          <h2 className="cta-h2">Ready to Start Your Protocol?</h2>
          <p className="cta-sub">
            Browse our full catalogue of pharmaceutical-grade peptides. Each product includes 
            a personalised dosing guide, free UK shipping, and practitioner support.
          </p>
          <Link to="/products" className="btn btn--glow btn--lg">
            Browse All Products
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <p className="cta-note">Free UK shipping · Protocol guide included · 30-day guarantee</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
