import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/authApi'
import { getErrorMessage } from '../api/apiClient'

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await signup({ name, email, password })
      navigate('/login', {
        replace: true,
        state: { message: '회원가입이 완료되었습니다. 로그인해 주세요.' },
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">Create account</p>
        <h1 id="signup-title">회원가입</h1>
        <p className="page-description">
          취향을 채우는 공연, 오래 남는 순간. 지금 시작해 보세요.
        </p>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            이름
            <input
              autoComplete="name"
              maxLength={50}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label>
            이메일
            <input
              autoComplete="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            비밀번호
            <input
              autoComplete="new-password"
              minLength={8}
              maxLength={12}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <span className="field-hint">8자 이상 12자 이하</span>
          </label>

          <button className="button primary full-width" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="auth-switch">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      </section>
    </main>
  )
}
