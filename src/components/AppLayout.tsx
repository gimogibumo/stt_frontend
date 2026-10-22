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
      <a className="skip-link" href="#main-content">
        본문 바로가기
      </a>
      <header className="site-header">
        <Link className="brand" to="/concerts">
          <span className="brand-mark" aria-hidden="true">
            s.
          </span>
          <span>
            <strong>
              stt<span>ticket</span>
            </strong>
            <small>일상이 무대가 되는 순간</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="주요 메뉴">
          <NavLink to="/concerts">공연 둘러보기</NavLink>
          <NavLink to="/my/reservations">마이티켓</NavLink>
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

      <div className="content-shell" id="main-content" tabIndex={-1}>
        <Outlet />
      </div>

      <footer className="site-footer">
        <div className="footer-brand">
          <strong>
            stt<span>ticket</span>
          </strong>
          <p>좋아하는 공연과 만나는 가장 설레는 순간.</p>
          <small>© STT TICKET. Survive the Traffic.</small>
        </div>
        <div className="footer-links">
          <Link to="/concerts">공연 둘러보기</Link>
          <Link to="/my/reservations">
            나의 예매 내역 <span aria-hidden="true">↗</span>
          </Link>
          <span>공연의 시작부터, 당신의 자리까지.</span>
        </div>
      </footer>
    </div>
  )
}
