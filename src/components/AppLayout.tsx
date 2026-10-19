import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(getErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/concerts">
          <span className="brand-mark">ST</span>
          <span>
            <strong>Survive the Traffic</strong>
            <small>Ticketing</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="주요 메뉴">
          <NavLink to="/concerts">공연</NavLink>
          {user && <NavLink to="/my/reservations">내 예약</NavLink>}
        </nav>

        <div className="account-nav">
          {user ? (
            <>
              <span className="user-name">{user.name}</span>
              <button
                className="text-button"
                type="button"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
              >
                {isLoggingOut ? '로그아웃 중' : '로그아웃'}
              </button>
            </>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <Link className="compact-button" to="/signup">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>

      {logoutError && (
        <div className="global-alert" role="alert">
          {logoutError}
        </div>
      )}

      <div className="content-shell">
        <Outlet />
      </div>

      <footer className="site-footer">
        실제 Survive the Traffic 백엔드와 연결된 Phase 6 프론트엔드
      </footer>
    </div>
  )
}

