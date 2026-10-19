import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'

export default function ProtectedRoute() {
  const { user, isLoading, restoreError, restore } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingPanel message="로그인 상태를 확인하고 있습니다." />
  }

  if (restoreError) {
    return (
      <ErrorPanel
        title="로그인 상태를 확인하지 못했습니다."
        message={restoreError}
        onRetry={() => void restore()}
      />
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

