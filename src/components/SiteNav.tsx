import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function SiteNav() {
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Products' },
  ]

  return (
    <header className="sn">
      <div className="sn-inner">
        <Link to="/" className="sn-logo">
          <img src="/images/logo.png" alt="Peptiva Research" className="sn-logo-img" />
        </Link>

        <nav className={`sn-links ${mobileOpen ? 'sn-links--open' : ''}`}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`sn-link ${pathname === l.to ? 'sn-link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="sn-right">
          <button
            type="button"
            className="sn-burger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
