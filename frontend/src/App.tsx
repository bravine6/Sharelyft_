import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
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
          <Route path="/settings" element={<div>Settings Page</div>} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App