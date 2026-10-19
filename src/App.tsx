import { Link, Route, Routes } from 'react-router-dom'

function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Ticketing service</p>
        <h1 id="page-title">Survive the Traffic</h1>
        <p className="description">
          실제 백엔드 API와 연결할 React 프론트엔드의 기본 구성이 준비되었습니다.
        </p>
        <p className="notice">
          다음 단계에서 확인된 API 계약에 맞춰 로그인과 공연 목록부터 연결합니다.
        </p>
      </section>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">페이지를 찾을 수 없습니다.</h1>
        <Link className="home-link" to="/">
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
