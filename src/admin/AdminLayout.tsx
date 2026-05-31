import { useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AdminBrandProvider, useAdminBrand } from './context/AdminBrandContext'
import { ConfigProvider } from '../lib/config/ConfigProvider'
import { AdminNav } from './components/AdminNav'
import { AdminErrorBoundary } from './components/ErrorBoundary'
import { BRAND_LABELS } from '../lib/config/brand'
import './admin.css'

function AdminConfigGate({ children }: { children: ReactNode }) {
  const { brand } = useAdminBrand()
  return <ConfigProvider brand={brand}>{children}</ConfigProvider>
}

/**
 * Resolve a pathname like /admin/marketing/ads/studio into a list of
 * breadcrumb crumbs: [Section, Subsection, Page]. Falls back to humanising
 * the path segments when an entry isn't in the override map.
 */
const BREADCRUMB_LABELS: Record<string, string> = {
  admin: 'Dashboard',
  'site-config': 'Site config',
  content: 'Catalogue',
  marketing: 'Marketing',
  ops: 'Operations',
  ads: 'Ad Studio',
  faqs: 'FAQs',
  seo: 'SEO defaults',
  'feature-flags': 'Feature flags',
  'meta-ads': 'Meta Ads',
  whatsapp: 'WhatsApp',
  'promo-codes': 'Promo codes',
  'upsell-offers': 'Upsell offers',
  blocks: 'Copy blocks',
  legal: 'Legal pages',
  support: 'Support inbox',
}

function humanise(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function buildCrumbs(pathname: string): { label: string; to: string | null }[] {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0 || parts[0] !== 'admin') return []
  // Special-case the root admin dashboard.
  if (parts.length === 1) return [{ label: 'Dashboard', to: null }]

  return parts.slice(1).map((seg, i, arr) => {
    const isLast = i === arr.length - 1
    // We omit the section name as the first crumb root pretty-name; instead
    // we let the segments themselves speak. The first segment is the section.
    return {
      label: BREADCRUMB_LABELS[seg] ?? humanise(seg),
      to: isLast ? null : ['/admin', ...arr.slice(0, i + 1)].join('/'),
    }
  })
}

function Breadcrumbs() {
  const { pathname } = useLocation()
  const crumbs = buildCrumbs(pathname)
  if (crumbs.length === 0) return null
  return (
    <nav className="admin-breadcrumb" aria-label="Breadcrumb">
      <Link to="/admin">Admin</Link>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-2">
          <span className="admin-breadcrumb-sep" aria-hidden>/</span>
          {c.to
            ? <Link to={c.to}>{c.label}</Link>
            : <span className="admin-breadcrumb-current">{c.label}</span>}
        </span>
      ))}
    </nav>
  )
}

function TopBar({
  onToggleNav,
}: {
  onToggleNav: () => void
}) {
  const { brand } = useAdminBrand()
  const [now, setNow] = useState(() => new Date())

  // Tick the clock every 30s; gives the bar a subtle "live" feel and a
  // useful reference for when you're staring at metrics.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="admin-header sticky top-0 z-30 flex h-12 items-center justify-between gap-4 px-4 lg:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleNav}
          className="rounded-md p-1.5 text-[var(--color-admin-muted)] transition-colors hover:bg-[var(--color-admin-surface-hover)] hover:text-[var(--color-admin-text-strong)] lg:hidden"
          aria-label="Toggle navigation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <Breadcrumbs />
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <span className="admin-mono text-[11px] text-[var(--color-admin-subtle)]">
          {BRAND_LABELS[brand]}
        </span>
        <span className="h-3 w-px bg-[var(--color-admin-border)]" aria-hidden />
        <time
          dateTime={now.toISOString()}
          className="admin-mono text-[11px] text-[var(--color-admin-muted)]"
          title={now.toString()}
        >
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </time>
      </div>
    </header>
  )
}

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  // Close mobile nav whenever the user navigates. Deferred via microtask
  // so we never call setState synchronously inside the effect body.
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setNavOpen(false) })
    return () => { cancelled = true }
  }, [location.pathname])

  return (
    <AdminBrandProvider>
      <AdminConfigGate>
        <div className="admin-root flex min-h-screen">
          {/* Sidebar — full-height, owns identity + nav + footer */}
          <aside
            className={`admin-sidebar fixed inset-y-0 left-0 z-30 w-[244px] transform transition-transform duration-200 lg:static lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <AdminNav />
          </aside>

          {navOpen ? (
            <div
              className="fixed inset-0 z-20 bg-[rgba(15,18,22,0.32)] backdrop-blur-[2px] lg:hidden"
              aria-hidden
              onClick={() => setNavOpen(false)}
            />
          ) : null}

          {/* Right column: thin breadcrumb top bar + page content */}
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onToggleNav={() => setNavOpen(o => !o)} />
            <main className="flex-1 overflow-x-hidden">
              <div
                key={location.pathname}
                className="admin-page-enter mx-auto max-w-[1200px] px-5 py-7 lg:px-10 lg:py-10"
              >
                <AdminErrorBoundary>
                  <Outlet />
                </AdminErrorBoundary>
              </div>
            </main>
          </div>
        </div>
      </AdminConfigGate>
    </AdminBrandProvider>
  )
}
