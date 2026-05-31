import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './RequireAdmin'
import { AdminLayout } from './AdminLayout'
import AdminLoginPage from './AdminLoginPage'
import DashboardPage from './pages/DashboardPage'
import BrandPage from './pages/site-config/BrandPage'
import TrackingPage from './pages/site-config/TrackingPage'
import WhatsAppPage from './pages/site-config/WhatsAppPage'
import SeoPage from './pages/site-config/SeoPage'
import FeatureFlagsPage from './pages/site-config/FeatureFlagsPage'
import ThemePage from './pages/site-config/ThemePage'
import ProductsListPage from './pages/content/ProductsListPage'
import ProductEditPage from './pages/content/ProductEditPage'
import ReviewsPage from './pages/content/ReviewsPage'
import FaqsPage from './pages/content/FaqsPage'
import ContentBlocksPage from './pages/content/ContentBlocksPage'
import LegalPagesPage from './pages/content/LegalPagesPage'
import QuizPage from './pages/content/QuizPage'
import OrdersPage from './pages/ops/OrdersPage'
import LeadsPage from './pages/ops/LeadsPage'
import MembersPage from './pages/ops/MembersPage'
import SupportInboxPage from './pages/ops/SupportInboxPage'
import PromoCodesPage from './pages/marketing/PromoCodesPage'
import UpsellOffersPage from './pages/marketing/UpsellOffersPage'
import BannersPage from './pages/marketing/BannersPage'

/**
 * All /admin/* routes. Wrapped in <RequireAdmin> so unauthenticated users
 * are redirected to /members/login and non-admins see an explanatory page.
 *
 * Phase 0 shipped the shell; Phase 1 adds the six site-config pages
 * which deliver the "manage pixels without code edits" value.
 */
export function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route
        path="*"
        element={
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

                <Route path="content">
                  <Route index element={<Navigate to="products" replace />} />
                  <Route path="products" element={<ProductsListPage />} />
                  <Route path="products/:id" element={<ProductEditPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="faqs" element={<FaqsPage />} />
                  <Route path="blocks" element={<ContentBlocksPage />} />
                  <Route path="legal" element={<LegalPagesPage />} />
                  <Route path="quiz" element={<QuizPage />} />
                </Route>

                <Route path="ops">
                  <Route index element={<Navigate to="orders" replace />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="members" element={<MembersPage />} />
                  <Route path="support" element={<SupportInboxPage />} />
                </Route>

                <Route path="marketing">
                  <Route index element={<Navigate to="promo-codes" replace />} />
                  <Route path="promo-codes" element={<PromoCodesPage />} />
                  <Route path="upsell-offers" element={<UpsellOffersPage />} />
                  <Route path="banners" element={<BannersPage />} />
                </Route>

                <Route path="*" element={<DashboardPage />} />
              </Route>
            </Routes>
          </RequireAdmin>
        }
      />
    </Routes>
  )
}
