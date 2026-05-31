import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Brand, getBrand } from '../../lib/config/brand'

interface AdminBrandContextType {
  brand: Brand
  setBrand: (next: Brand) => void
}

const AdminBrandContext = createContext<AdminBrandContextType | null>(null)

const STORAGE_KEY = 'admin-active-brand'

/**
 * Lets the admin temporarily switch which brand they are managing. Defaults
 * to the deployment's brand (from VITE_BRAND). The choice is persisted in
 * localStorage so reloading the admin keeps the active brand.
 */
export function AdminBrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<Brand>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'vitalabs' || stored === 'peptiva') return stored
    } catch { /* ignore */ }
    return getBrand()
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, brand) } catch { /* ignore */ }
  }, [brand])

  return (
    <AdminBrandContext.Provider value={{ brand, setBrand: setBrandState }}>
      {children}
    </AdminBrandContext.Provider>
  )
}

export function useAdminBrand() {
  const ctx = useContext(AdminBrandContext)
  if (!ctx) throw new Error('useAdminBrand must be used inside AdminBrandProvider')
  return ctx
}
