import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

/* Inline 16px icons — keeps the bundle slim (no icon library) and lets
   each icon inherit currentColor for hover / active states. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const Icon = {
  Dashboard: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="2" y="8.5" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" />
    </svg>
  ),
  Brand: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M8 1.5l5.5 3v4.5L8 14.5 2.5 9V4.5L8 1.5z" />
      <path d="M8 1.5v13" />
      <path d="M2.5 4.5L13.5 4.5" />
    </svg>
  ),
  Pixel: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  Chat: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M2.5 3.5h11v7.5h-7l-4 3v-10.5z" />
    </svg>
  ),
  Globe: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 1.8 3 3.8 3 6s-1 4.2-3 6c-2-1.8-3-3.8-3-6s1-4.2 3-6z" />
    </svg>
  ),
  Flag: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M3.5 2v12" />
      <path d="M3.5 2.5h8.5l-2 3 2 3h-8.5" />
    </svg>
  ),
  Palette: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8s2.9 6.5 6.5 6.5c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .9-1.7 1.9-1.7H12c1.4 0 2.5-1.1 2.5-2.5C14.5 4.2 11.4 1.5 8 1.5z" />
      <circle cx="5" cy="6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8" cy="4.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="11" cy="6" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  ),
  Box: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M8 1.5l6 3v7l-6 3-6-3v-7l6-3z" />
      <path d="M2 4.5l6 3 6-3M8 7.5v7" />
    </svg>
  ),
  Star: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M8 1.5l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.5 4.1 13.6l.8-4.4L1.7 6.1l4.4-.6L8 1.5z" />
    </svg>
  ),
  Help: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6c0-1.1.9-2 2-2s2 .9 2 2c0 .9-.9 1.3-1.5 1.7-.4.3-.5.7-.5 1.3" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  Doc: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M3.5 1.5h6l3 3v10h-9v-13z" />
      <path d="M9.5 1.5v3h3M5 7.5h6M5 10.5h6M5 4.5h2" />
    </svg>
  ),
  Scale: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M8 2v12M3 4h10M3 13h10" />
      <path d="M5.5 4l-2 4h4l-2-4zM10.5 4l-2 4h4l-2-4z" />
    </svg>
  ),
  Quiz: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6.5c0-1.1.9-1.9 2-1.9s2 .8 2 1.9c0 .9-1 1.2-1.5 1.7-.3.3-.5.6-.5 1" />
      <circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  Cart: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M1.5 2.5h2l1.5 8.5h7.5l1.5-6h-9" />
      <circle cx="6" cy="13.5" r="0.8" />
      <circle cx="12" cy="13.5" r="0.8" />
    </svg>
  ),
  Users: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <circle cx="6" cy="5.5" r="2.2" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <circle cx="11.5" cy="6" r="1.8" />
      <path d="M14.5 13c0-1.8-1.3-3.4-3-3.7" />
    </svg>
  ),
  Member: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M2.5 14c0-3 2.4-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
    </svg>
  ),
  Inbox: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M2 8.5L3.5 3h9L14 8.5v5h-12v-5z" />
      <path d="M2 8.5h3l1 1.5h4l1-1.5h3" />
    </svg>
  ),
  Tag: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M2.5 2.5h6L14 8l-5.5 5.5L2.5 7.5v-5z" />
      <circle cx="5.5" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  Sparkle: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M8 1.5L9 6l4.5 1L9 8l-1 4.5L7 8 2.5 7 7 6l1-4.5z" />
      <path d="M13 11l.5 1.5L15 13l-1.5.5L13 15l-.5-1.5L11 13l1.5-.5L13 11z" />
    </svg>
  ),
  Megaphone: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M2.5 6h3l6-3v10l-6-3h-3v-4z" />
      <path d="M11.5 5.5c1 .5 1.5 1.3 1.5 2.5s-.5 2-1.5 2.5" />
    </svg>
  ),
  Wand: (
    <svg viewBox="0 0 16 16" width="16" height="16" {...stroke}>
      <path d="M3 13l8-8" />
      <path d="M10 4l2 2" />
      <path d="M13 8l.6 1.4L15 10l-1.4.6L13 12l-.6-1.4L11 10l1.4-.6L13 8z" />
      <path d="M4 3l.4 1L5.5 4.5 4.4 5l-.4 1-.4-1L2.5 4.5 3.6 4 4 3z" />
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
    ],
  },
  {
    title: 'Content',
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
      { to: '/admin/ops/support', label: 'Support', icon: Icon.Inbox },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/marketing/promo-codes', label: 'Promo codes', icon: Icon.Tag },
      { to: '/admin/marketing/upsell-offers', label: 'Upsell offers', icon: Icon.Sparkle },
      { to: '/admin/marketing/banners', label: 'Banners', icon: Icon.Megaphone },
      { to: '/admin/marketing/ads', label: 'Ad Studio', icon: Icon.Wand },
    ],
  },
]

export function AdminNav() {
  return (
    <nav className="flex flex-col gap-5 p-3">
      {NAV.map(group => (
        <div key={group.title}>
          <h3 className="admin-nav-group-title px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-admin-subtle)]">
            {group.title}
          </h3>
          <ul className="mt-2 flex flex-col">
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
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
