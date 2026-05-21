import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import DisclaimerPage from './pages/DisclaimerPage'
import ShippingPage from './pages/ShippingPage'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import CapturePage from './pages/CapturePage'
import ResultsPage from './pages/ResultsPage'
import UpsellPage from './pages/UpsellPage'
import TSLPage from './pages/TSLPage'
import CheckoutPage from './pages/CheckoutPage'
import TestPaymentPage from './pages/TestPaymentPage'
import OrderCompletePage from './pages/OrderCompletePage'
import ThemeToggle from './components/ThemeToggle'
import { AuthProvider, useAuth } from './members/context/AuthContext'
import MembersLayout from './members/components/MembersLayout'
import LoginPage from './members/pages/LoginPage'
import SignupPage from './members/pages/SignupPage'
import OnboardingPage from './members/pages/OnboardingPage'
import DashboardPage from './members/pages/DashboardPage'
import NutritionPage from './members/pages/NutritionPage'
import TrainingPage from './members/pages/TrainingPage'
import ProgressPage from './members/pages/ProgressPage'
import ProtocolPage from './members/pages/ProtocolPage'
import SupportPage from './members/pages/SupportPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/members/login" replace />
  if (!user.profile) return <Navigate to="/members/onboarding" replace />
  return <>{children}</>
}

function RequireAuthOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/members/login" replace />
  return <>{children}</>
}

function MembersRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="onboarding" element={<RequireAuthOnly><OnboardingPage /></RequireAuthOnly>} />
      <Route element={<RequireAuth><MembersLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="protocol" element={<ProtocolPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/members" replace />} />
    </Routes>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const hideThemeToggle =
    pathname === '/' ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/products') ||
    ['/capture', '/results', '/upsell', '/tsl', '/checkout', '/order-complete', '/terms', '/privacy', '/refund-policy', '/disclaimer', '/shipping'].includes(pathname) ||
    pathname.startsWith('/members')
  const showToggle = !hideThemeToggle

  return (
    <AuthProvider>
      <Routes>
        {/* Main site */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />

        {/* Legal / Compliance */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/shipping" element={<ShippingPage />} />

        {/* Quiz funnel (moved to /quiz subfolder) */}
        <Route path="/quiz" element={<HomePage />} />
        <Route path="/quiz/:gender" element={<QuizPage />} />

        {/* Funnel continuation */}
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/upsell" element={<UpsellPage />} />
        <Route path="/tsl" element={<TSLPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/test-payment" element={<TestPaymentPage />} />
        <Route path="/order-complete" element={<OrderCompletePage />} />

        {/* Members area */}
        <Route path="/members/*" element={<MembersRoutes />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showToggle && <ThemeToggle />}
    </AuthProvider>
  )
}
