import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ConcertDetailPage from './pages/ConcertDetailPage'
import ConcertListPage from './pages/ConcertListPage'
import LoginPage from './pages/LoginPage'
import MyReservationsPage from './pages/MyReservationsPage'
import NotFoundPage from './pages/NotFoundPage'
import PaymentPage from './pages/PaymentPage'
import QueuePage from './pages/QueuePage'
import SeatsPage from './pages/SeatsPage'
import SignupPage from './pages/SignupPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/concerts" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="concerts" element={<ConcertListPage />} />
          <Route path="concerts/:concertId" element={<ConcertDetailPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="concerts/:concertId/queue" element={<QueuePage />} />
            <Route path="concerts/:concertId/seats" element={<SeatsPage />} />
            <Route
              path="reservations/:reservationId/payment"
              element={<PaymentPage />}
            />
            <Route path="my/reservations" element={<MyReservationsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
