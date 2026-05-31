import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../members/context/AuthContext'
import { AdminBrandProvider, useAdminBrand } from './context/AdminBrandContext'
import { ConfigProvider } from '../lib/config/ConfigProvider'
import { AdminNav } from './components/AdminNav'
import { BrandSwitcher } from './components/BrandSwitcher'
import { Button } from './components/ui/Button'
import { AdminErrorBoundary } from './components/ErrorBoundary'
import './admin.css'

function AdminConfigGate({ children }: { children: ReactNode }) {
  const { brand } = useAdminBrand()
  return <ConfigProvider brand={brand}>{children}</ConfigProvider>
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <AdminBrandProvider>
      <AdminConfigGate>
      <div className="admin-root flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-admin-border)] bg-white px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(o => !o)}
              className="rounded-md p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="text-sm font-semibold tracking-tight text-[var(--color-admin-primary)]">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <BrandSwitcher />
            {user ? <span className="hidden text-xs text-[var(--color-admin-muted)] sm:inline">{user.email}</span> : null}
            <Button variant="ghost" size="sm" onClick={() => logout()}>Sign out</Button>
          </div>
        </header>

        <div className="flex flex-1">
          <aside
            className={`fixed inset-y-14 left-0 z-20 w-64 transform border-r border-[var(--color-admin-border)] bg-white transition-transform lg:static lg:inset-y-0 lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="h-full overflow-y-auto">
              <AdminNav />
            </div>
          </aside>

          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
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
