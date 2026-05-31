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
      <div className="admin-root flex min-h-screen flex-col bg-[var(--color-admin-bg)]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-admin-border)] bg-[var(--color-admin-bg)]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-admin-bg)]/70">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(o => !o)}
              className="rounded-md p-2 text-[var(--color-admin-muted)] transition-colors hover:bg-[var(--color-admin-surface-hover)] hover:text-[var(--color-admin-text)] lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-admin-primary)] text-xs font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset]">
                VL
              </div>
              <span className="text-sm font-semibold tracking-tight text-[var(--color-admin-text-strong)]">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BrandSwitcher />
            {user ? (
              <span className="hidden text-xs text-[var(--color-admin-muted)] sm:inline">{user.email}</span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => logout()}>Sign out</Button>
          </div>
        </header>

        <div className="flex flex-1">
          <aside
            className={`fixed inset-y-14 left-0 z-20 w-64 transform border-r border-[var(--color-admin-border)] bg-[var(--color-admin-bg-soft)] transition-transform lg:static lg:inset-y-0 lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="h-full overflow-y-auto">
              <AdminNav />
            </div>
          </aside>

          {navOpen ? (
            <div
              className="fixed inset-0 z-10 bg-black/50 lg:hidden"
              aria-hidden
              onClick={() => setNavOpen(false)}
            />
          ) : null}

          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
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
