import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import CapturePage from './pages/CapturePage'
import ResultsPage from './pages/ResultsPage'
import UpsellPage from './pages/UpsellPage'
import TSLPage from './pages/TSLPage'
import CheckoutPage from './pages/CheckoutPage'
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
    ['/capture', '/results', '/upsell', '/tsl', '/checkout'].includes(pathname) ||
    pathname.startsWith('/members')
  const showToggle = !hideThemeToggle

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz/:gender" element={<QuizPage />} />
        <Route path="/quiz" element={<Navigate to="/" replace />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/upsell" element={<UpsellPage />} />
        <Route path="/tsl" element={<TSLPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/members/*" element={<MembersRoutes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showToggle && <ThemeToggle />}
    </AuthProvider>
  )
}
