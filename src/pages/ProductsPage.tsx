import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PEPTIDES } from '../data/peptides'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

const CATEGORY_FILTERS = [
  { label: 'All Products', slug: '' },
  { label: 'Weight Management', slug: 'weight-management' },
  { label: 'Strength & Recovery', slug: 'strength-recovery' },
  { label: 'Cellular Repair & Anti-Aging', slug: 'cellular-repair' },
  { label: 'Growth Hormone Research', slug: 'growth-hormone' },
  { label: 'Melanocortin Research', slug: 'melanocortin' },
]

function categoryToSlug(category: string): string {
  if (category.toLowerCase().includes('weight')) return 'weight-management'
  if (category.toLowerCase().includes('strength')) return 'strength-recovery'
  if (category.toLowerCase().includes('growth')) return 'growth-hormone'
  if (category.toLowerCase().includes('melanocortin')) return 'melanocortin'
  return 'cellular-repair'
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default')

  const filtered = useMemo(() => {
    let result = PEPTIDES
    if (activeCategory) {
      result = result.filter((p) => categoryToSlug(p.category) === activeCategory)
    }
    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.doses[0].price - b.doses[0].price)
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.doses[0].price - a.doses[0].price)
    }
    return result
  }, [activeCategory, sortBy])

  return (
    <div className="st">
      <SiteNav />

      <section className="st-page-hero">
        <div className="st-container">
          <span className="overline">Product Catalogue</span>
          <h1 className="st-page-h1">Our Products</h1>
          <p className="st-page-sub">
            Every compound is independently lab-tested, batch-traceable, and verified at 98%+ purity. 
            Select a category below or browse the full range.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '1rem' }}>
        <div className="st-container">
          <div className="st-toolbar">
            <div className="st-filters">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.slug}
                  type="button"
                  className={`st-filter-btn ${activeCategory === f.slug ? 'st-filter-btn--active' : ''}`}
                  onClick={() => {
                    if (f.slug) setSearchParams({ category: f.slug })
                    else setSearchParams({})
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              className="st-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>

          <div className="st-products">
            {filtered.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="st-prod-card">
                <div className="st-prod-img-wrap">
                  {p.image ? (
                    <img src={p.image} alt={p.compound} className="st-prod-img" />
                  ) : (
                    <div className="st-prod-img st-prod-img--placeholder" />
                  )}
                  <span className="st-prod-badge">{p.category}</span>
                </div>
                <div className="st-prod-body">
                  <h3 className="st-prod-name">{p.compound}</h3>
                  <p className="st-prod-tag">{p.tagline}</p>
                  <div className="st-prod-foot">
                    <span className="st-prod-price">From £{p.doses[0]?.price.toFixed(2)}</span>
                    {p.doses.length > 1 && (
                      <span className="st-prod-doses">{p.doses.length} doses</span>
                    )}
                  </div>
                  <span className="st-prod-link">View Details →</span>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="st-empty">
              <p>No products found in this category.</p>
              <button type="button" className="st-btn st-btn--outline" onClick={() => setSearchParams({})}>
                View All Products
              </button>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
