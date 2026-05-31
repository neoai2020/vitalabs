import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/admin/marketing/ads/studio', label: 'Studio' },
  { to: '/admin/marketing/ads/campaigns', label: 'Campaigns' },
  { to: '/admin/marketing/ads/insights', label: 'Insights' },
]

export function AdsTabBar() {
  return (
    <div className="mb-6 flex items-center gap-2">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => `admin-tab${isActive ? ' admin-tab--active' : ''}`}
          style={{ fontSize: 13, padding: '6px 14px' }}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
