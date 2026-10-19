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
      <div className="utility-bar">
        <span>LIVE TICKETING PLATFORM</span>
        <span>안전한 대기열 기반 예매</span>
      </div>
      <header className="site-header">
        <Link className="brand" to="/concerts">
          <span className="brand-mark">
            <i />
            ST
          </span>
          <span>
            <strong>STT TICKET</strong>
            <small>Survive the Traffic</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="주요 메뉴">
          <NavLink to="/concerts">공연 전체</NavLink>
          {user && <NavLink to="/my/reservations">예매 내역</NavLink>}
        </nav>

        <div className="account-nav">
          {user ? (
            <>
              <span className="user-name">
                <i />
                {user.name}
              </span>
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
        <div>
          <strong>STT TICKET</strong>
          <span>Survive the Traffic</span>
        </div>
        <p>실제 대기열과 좌석 상태를 기반으로 동작하는 티켓 예매 서비스</p>
      </footer>
    </div>
  )
}

