import { NavLink, useLocation } from 'react-router-dom'
import { useLayoutEffect, useRef, useState } from 'react'

const TABS = [
  { to: '/admin/marketing/ads/studio', label: 'Studio' },
  { to: '/admin/marketing/ads/campaigns', label: 'Campaigns' },
  { to: '/admin/marketing/ads/insights', label: 'Insights' },
]

/**
 * AdsTabBar — segmented control with a sliding indicator that morphs
 * between tabs on route change. Same motion language as the main nav.
 */
export function AdsTabBar() {
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const links = Array.from(containerRef.current.querySelectorAll<HTMLAnchorElement>('a[data-tab-to]'))
    const active = links.find(a => location.pathname.startsWith(a.dataset.tabTo!))
    if (!active) { setRect(null); return }
    const r = active.getBoundingClientRect()
    const parentR = containerRef.current.getBoundingClientRect()
    setRect({ left: r.left - parentR.left, width: r.width })
  }, [location.pathname])

  return (
    <div
      ref={containerRef}
      className="relative mb-6 inline-flex items-center gap-1 rounded-md border border-[var(--color-admin-border-strong)] bg-[var(--color-admin-surface)] p-0.5"
    >
      {rect ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 bottom-0.5 rounded bg-[var(--color-admin-text-strong)]"
          style={{
            left: rect.left,
            width: rect.width,
            transition: 'left 280ms cubic-bezier(0.32, 0.72, 0, 1), width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        />
      ) : null}
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          data-tab-to={t.to}
          className={({ isActive }) =>
            `relative z-10 rounded px-3 py-1 text-[12.5px] font-medium transition-colors ${
              isActive ? 'text-white' : 'text-[var(--color-admin-muted)] hover:text-[var(--color-admin-text-strong)]'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
