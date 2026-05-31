import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './RequireAdmin'
import { AdminLayout } from './AdminLayout'
import DashboardPage from './pages/DashboardPage'
import BrandPage from './pages/site-config/BrandPage'
import TrackingPage from './pages/site-config/TrackingPage'
import WhatsAppPage from './pages/site-config/WhatsAppPage'
import SeoPage from './pages/site-config/SeoPage'
import FeatureFlagsPage from './pages/site-config/FeatureFlagsPage'
import ThemePage from './pages/site-config/ThemePage'

/**
 * All /admin/* routes. Wrapped in <RequireAdmin> so unauthenticated users
 * are redirected to /members/login and non-admins see an explanatory page.
 *
 * Phase 0 shipped the shell; Phase 1 adds the six site-config pages
 * which deliver the "manage pixels without code edits" value.
 */
export function AdminRoutes() {
  return (
    <RequireAdmin>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="site-config">
            <Route index element={<Navigate to="brand" replace />} />
            <Route path="brand" element={<BrandPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="whatsapp" element={<WhatsAppPage />} />
            <Route path="seo" element={<SeoPage />} />
            <Route path="feature-flags" element={<FeatureFlagsPage />} />
            <Route path="theme" element={<ThemePage />} />
          </Route>

          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </RequireAdmin>
  )
}
