import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', end: true },
    ],
  },
  {
    title: 'Site config',
    items: [
      { to: '/admin/site-config/brand', label: 'Brand' },
      { to: '/admin/site-config/tracking', label: 'Tracking pixels' },
      { to: '/admin/site-config/whatsapp', label: 'WhatsApp' },
      { to: '/admin/site-config/seo', label: 'SEO defaults' },
      { to: '/admin/site-config/feature-flags', label: 'Feature flags' },
      { to: '/admin/site-config/theme', label: 'Theme' },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/admin/content/products', label: 'Products' },
      { to: '/admin/content/reviews', label: 'Reviews' },
      { to: '/admin/content/faqs', label: 'FAQs' },
      { to: '/admin/content/blocks', label: 'Copy blocks' },
      { to: '/admin/content/legal', label: 'Legal pages' },
      { to: '/admin/content/quiz', label: 'Quiz' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/ops/orders', label: 'Orders' },
      { to: '/admin/ops/leads', label: 'Leads' },
      { to: '/admin/ops/members', label: 'Members' },
      { to: '/admin/ops/support', label: 'Support' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/marketing/promo-codes', label: 'Promo codes' },
      { to: '/admin/marketing/upsell-offers', label: 'Upsell offers' },
      { to: '/admin/marketing/banners', label: 'Banners' },
    ],
  },
]

export function AdminNav() {
  return (
    <nav className="flex flex-col gap-6 p-4">
      {NAV.map(group => (
        <div key={group.title}>
          <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-admin-subtle)]">
            {group.title}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    'group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all',
                    isActive
                      ? 'bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-text-strong)] font-medium'
                      : 'text-[var(--color-admin-muted)] hover:bg-[var(--color-admin-surface-hover)] hover:text-[var(--color-admin-text)]',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-[var(--color-admin-primary)]"
                        />
                      ) : null}
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
