import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/members', icon: '📊', label: 'Dashboard', end: true },
  { to: '/members/nutrition', icon: '🥗', label: 'Nutrition', end: false },
  { to: '/members/training', icon: '💪', label: 'Training', end: false },
  { to: '/members/progress', icon: '📈', label: 'Progress', end: false },
  { to: '/members/protocol', icon: '🧬', label: 'Protocol', end: false },
  { to: '/members/support', icon: '💬', label: 'Support', end: false },
]

export default function MembersLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/members/login')
  }

  const initials = user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : '??'

  return (
    <div className="m-layout">
      {/* SIDEBAR */}
      <aside className={`m-sidebar ${mobileOpen ? 'm-sidebar--open' : ''}`}>
        <div className="m-sidebar-brand">
          <span className="m-sidebar-logo">⬡</span>
          <span className="m-sidebar-name">Vita Labs</span>
        </div>
        <nav className="m-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `m-nav-item ${isActive ? 'm-nav-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="m-nav-icon">{item.icon}</span>
              <span className="m-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="m-sidebar-footer">
          <div className="m-sidebar-user">
            <div className="m-avatar">{initials}</div>
            <div className="m-sidebar-user-info">
              <span className="m-sidebar-user-name">{user?.firstName} {user?.lastName}</span>
              <span className="m-sidebar-user-plan">{user?.plan === '3-month' ? '3-Month Plan' : '1-Month Plan'}</span>
            </div>
          </div>
          <button type="button" className="m-logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && <div className="m-overlay" onClick={() => setMobileOpen(false)} />}

      {/* MAIN CONTENT */}
      <div className="m-main">
        <header className="m-header">
          <button type="button" className="m-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            <span /><span /><span />
          </button>
          <div className="m-header-greeting">
            <h1>Hey, {user?.firstName} 👋</h1>
          </div>
          <div className="m-header-right">
            <div className="m-avatar m-avatar--sm">{initials}</div>
          </div>
        </header>
        <main className="m-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
