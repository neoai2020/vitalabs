import { Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './RequireAdmin'
import { AdminLayout } from './AdminLayout'
import DashboardPage from './pages/DashboardPage'

/**
 * All /admin/* routes. Wrapped in <RequireAdmin> so unauthenticated users
 * are redirected to /members/login and non-admins see an explanatory page.
 *
 * Phase 0 ships the scaffold + Dashboard only. Subsequent phases add the
 * site-config/, content/, ops/, and marketing/ sub-routes.
 */
export function AdminRoutes() {
  return (
    <RequireAdmin>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </RequireAdmin>
  )
}
