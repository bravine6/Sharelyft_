import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifyPhonePage from './pages/VerifyPhonePage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import VerificationPage from './pages/VerificationPage'
import PaymentMethodsPage from './pages/PaymentMethodsPage'
import FindRidesPage from './pages/FindRidesPage'
import OfferRidePage from './pages/OfferRidePage'
import MyRidesPage from './pages/MyRidesPage'
import RideRequestsPage from './pages/RideRequestsPage'
import MyRideRequestsPage from './pages/MyRideRequestsPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/find-rides" element={<FindRidesPage />} />
          <Route path="/offer-ride" element={<OfferRidePage />} />
          <Route path="/my-rides" element={<MyRidesPage />} />
          <Route path="/ride-requests" element={<RideRequestsPage />} />
          <Route path="/my-ride-requests" element={<MyRideRequestsPage />} />
          <Route path="/rides/:id" element={<div>Ride Details Page</div>} />
          <Route path="/messages" element={<div>Messages Page</div>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/payment-methods" element={<PaymentMethodsPage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App