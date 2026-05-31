import { NavLink, useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../members/context/AuthContext'
import { useAdminBrand } from '../context/AdminBrandContext'
import { BRAND_LABELS, type Brand } from '../../lib/config/brand'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
  /** Optional small monospace badge on the right of the row (e.g. unread count). */
  badge?: string | number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const BRANDS: Brand[] = ['vitalabs', 'peptiva']

/* Inline 15-16px line icons — keeps the bundle slim (no icon library) and
   lets each icon inherit currentColor for hover / active states. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const Icon = {
  Dashboard: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="2" y="8.5" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" />
    </svg>
  ),
  Brand: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M8 1.5l5.5 3v4.5L8 14.5 2.5 9V4.5L8 1.5z" />
      <path d="M8 1.5v13M2.5 4.5L13.5 4.5" />
    </svg>
  ),
  Pixel: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  Chat: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M2.5 3.5h11v7.5h-7l-4 3v-10.5z" />
    </svg>
  ),
  Globe: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 1.8 3 3.8 3 6s-1 4.2-3 6c-2-1.8-3-3.8-3-6s1-4.2 3-6z" />
    </svg>
  ),
  Flag: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M3.5 2v12" />
      <path d="M3.5 2.5h8.5l-2 3 2 3h-8.5" />
    </svg>
  ),
  Palette: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8s2.9 6.5 6.5 6.5c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .9-1.7 1.9-1.7H12c1.4 0 2.5-1.1 2.5-2.5C14.5 4.2 11.4 1.5 8 1.5z" />
      <circle cx="5" cy="6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8" cy="4.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="11" cy="6" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  ),
  Box: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M8 1.5l6 3v7l-6 3-6-3v-7l6-3z" />
      <path d="M2 4.5l6 3 6-3M8 7.5v7" />
    </svg>
  ),
  Star: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M8 1.5l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.5 4.1 13.6l.8-4.4L1.7 6.1l4.4-.6L8 1.5z" />
    </svg>
  ),
  Help: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6c0-1.1.9-2 2-2s2 .9 2 2c0 .9-.9 1.3-1.5 1.7-.4.3-.5.7-.5 1.3" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  Doc: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M3.5 1.5h6l3 3v10h-9v-13z" />
      <path d="M9.5 1.5v3h3M5 7.5h6M5 10.5h6M5 4.5h2" />
    </svg>
  ),
  Scale: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M8 2v12M3 4h10M3 13h10" />
      <path d="M5.5 4l-2 4h4l-2-4zM10.5 4l-2 4h4l-2-4z" />
    </svg>
  ),
  Quiz: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 7h6M5 10h4" />
    </svg>
  ),
  Cart: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M1.5 2.5h2l1.5 8.5h7.5l1.5-6h-9" />
      <circle cx="6" cy="13.5" r="0.8" />
      <circle cx="12" cy="13.5" r="0.8" />
    </svg>
  ),
  Users: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <circle cx="6" cy="5.5" r="2.2" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <circle cx="11.5" cy="6" r="1.8" />
      <path d="M14.5 13c0-1.8-1.3-3.4-3-3.7" />
    </svg>
  ),
  Member: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M2.5 14c0-3 2.4-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
    </svg>
  ),
  Inbox: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M2 8.5L3.5 3h9L14 8.5v5h-12v-5z" />
      <path d="M2 8.5h3l1 1.5h4l1-1.5h3" />
    </svg>
  ),
  Tag: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M2.5 2.5h6L14 8l-5.5 5.5L2.5 7.5v-5z" />
      <circle cx="5.5" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  Offer: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M2.5 6h11v7h-11z" />
      <path d="M5 6V4a3 3 0 016 0v2" />
    </svg>
  ),
  Megaphone: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <path d="M2.5 6h3l6-3v10l-6-3h-3v-4z" />
      <path d="M11.5 5.5c1 .5 1.5 1.3 1.5 2.5s-.5 2-1.5 2.5" />
    </svg>
  ),
  Ads: (
    <svg viewBox="0 0 16 16" width="15" height="15" {...stroke}>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 6.5l2.5 4 1-2 1.5 2" />
      <circle cx="11" cy="6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  Search: (
    <svg viewBox="0 0 16 16" width="14" height="14" {...stroke}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  Logout: (
    <svg viewBox="0 0 16 16" width="14" height="14" {...stroke}>
      <path d="M9.5 4.5v-2h-7v11h7v-2" />
      <path d="M6 8h8M11.5 5.5L14 8l-2.5 2.5" />
    </svg>
  ),
}

const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: Icon.Dashboard, end: true },
    ],
  },
  {
    title: 'Site config',
    items: [
      { to: '/admin/site-config/brand', label: 'Brand', icon: Icon.Brand },
      { to: '/admin/site-config/tracking', label: 'Tracking pixels', icon: Icon.Pixel },
      { to: '/admin/site-config/whatsapp', label: 'WhatsApp', icon: Icon.Chat },
      { to: '/admin/site-config/seo', label: 'SEO defaults', icon: Icon.Globe },
      { to: '/admin/site-config/feature-flags', label: 'Feature flags', icon: Icon.Flag },
      { to: '/admin/site-config/theme', label: 'Theme', icon: Icon.Palette },
      { to: '/admin/site-config/meta-ads', label: 'Meta Ads', icon: Icon.Megaphone },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/admin/content/products', label: 'Products', icon: Icon.Box },
      { to: '/admin/content/reviews', label: 'Reviews', icon: Icon.Star },
      { to: '/admin/content/faqs', label: 'FAQs', icon: Icon.Help },
      { to: '/admin/content/blocks', label: 'Copy blocks', icon: Icon.Doc },
      { to: '/admin/content/legal', label: 'Legal pages', icon: Icon.Scale },
      { to: '/admin/content/quiz', label: 'Quiz', icon: Icon.Quiz },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/ops/orders', label: 'Orders', icon: Icon.Cart },
      { to: '/admin/ops/leads', label: 'Leads', icon: Icon.Users },
      { to: '/admin/ops/members', label: 'Members', icon: Icon.Member },
      { to: '/admin/ops/support', label: 'Support inbox', icon: Icon.Inbox },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/marketing/promo-codes', label: 'Promo codes', icon: Icon.Tag },
      { to: '/admin/marketing/upsell-offers', label: 'Upsell offers', icon: Icon.Offer },
      { to: '/admin/marketing/banners', label: 'Banners', icon: Icon.Megaphone },
      { to: '/admin/marketing/ads', label: 'Ad Studio', icon: Icon.Ads },
    ],
  },
]

function userInitials(email?: string | null): string {
  if (!email) return 'VL'
  const [local] = email.split('@')
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (local.slice(0, 2)).toUpperCase()
}

/** Production vs Dev — derived from URL once (no SSR concerns in this app). */
function detectEnv(): 'production' | 'dev' {
  if (typeof window === 'undefined') return 'production'
  const host = window.location.hostname
  if (host === 'localhost' || host.startsWith('127.') || host.endsWith('.local')) return 'dev'
  return 'production'
}

export function AdminNav() {
  const { user, logout } = useAuth()
  const { brand, setBrand } = useAdminBrand()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const env = detectEnv()

  // Lightweight client-side filter: hides items that don't match the query.
  // Hides whole groups when none of their items match.
  const filteredNav = query.trim()
    ? NAV.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())),
      })).filter(g => g.items.length > 0)
    : NAV

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-sidebar-inner">
      {/* Brand block */}
      <div className="admin-workspace">
        <div className="admin-brand-badge h-8 w-8 text-[11px]">VL</div>
        <div className="admin-workspace-meta">
          <div className="admin-workspace-name">Vita Labs</div>
          <div className="admin-workspace-sub">Admin · UK</div>
        </div>
      </div>

      {/* Workspace (brand) switcher */}
      <select
        className="admin-workspace-switcher admin-mono"
        value={brand}
        onChange={e => setBrand(e.target.value as Brand)}
        aria-label="Switch brand"
      >
        {BRANDS.map(b => (
          <option key={b} value={b}>{BRAND_LABELS[b]}</option>
        ))}
      </select>

      {/* Search */}
      <div className="admin-sidebar-search">
        <span className="admin-sidebar-search-icon" aria-hidden>{Icon.Search}</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search navigation"
        />
        <span className="admin-kbd" aria-hidden>⌘K</span>
      </div>

      {/* Scrollable nav */}
      <nav className="admin-sidebar-scroll admin-nav" aria-label="Admin navigation">
        {filteredNav.length === 0 ? (
          <div className="px-5 py-3 text-[12px] text-[var(--color-admin-subtle)]">
            No matches for “{query}”.
          </div>
        ) : (
          filteredNav.map(group => (
            <div key={group.title} className="admin-nav-group">
              <h3 className="admin-nav-group-title">
                <span>{group.title}</span>
                <span className="admin-nav-group-title-count" aria-hidden>{group.items.length}</span>
              </h3>
              <ul className="flex flex-col">
                {group.items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`
                      }
                    >
                      <span className="admin-nav-item-icon" aria-hidden>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined ? (
                        <span className="admin-nav-item-badge admin-mono">{item.badge}</span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      {/* Footer: env pill + user */}
      <div className="admin-sidebar-footer">
        <span className="admin-env">
          <span className={`admin-env-dot${env === 'dev' ? ' admin-env-dot--dev' : ''}`} />
          {env === 'production' ? 'Production · live' : 'Local · dev'}
        </span>
        <div className="admin-user-row">
          <div className="admin-user-avatar">{userInitials(user?.email)}</div>
          <div className="admin-user-meta">
            <div className="admin-user-name">{user?.email ?? '—'}</div>
            <div className="admin-user-role">Admin</div>
          </div>
          <button
            type="button"
            className="admin-user-action"
            onClick={() => { void handleLogout() }}
            title="Sign out"
            aria-label="Sign out"
          >
            {Icon.Logout}
          </button>
        </div>
      </div>
    </div>
  )
}
