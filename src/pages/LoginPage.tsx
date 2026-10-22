import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'

interface LocationState {
  from?: { pathname: string; search?: string }
  message?: string
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/concerts', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await login({ email, password })
      const destination = state?.from
        ? `${state.from.pathname}${state.from.search || ''}`
        : '/concerts'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Welcome back</p>
        <h1 id="login-title">로그인</h1>
        <p className="page-description">
          기다려 온 무대와 더 가까이. 나의 다음 공연을 만나보세요.
        </p>

        {state?.message && <div className="success-banner">{state.message}</div>}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            이메일
            <input
              autoComplete="email"
              name="email"
              placeholder="이메일 주소를 입력해 주세요"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            비밀번호
            <input
              autoComplete="current-password"
              minLength={8}
              name="password"
              placeholder="비밀번호를 입력해 주세요"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button className="button primary full-width" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="auth-switch">
          계정이 없나요? <Link to="/signup">회원가입</Link>
        </p>
      </section>
    </main>
  )
}
