import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="page-stack narrow-page">
      <section className="state-panel">
        <p className="eyebrow">404</p>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <Link className="button primary" to="/concerts">
          공연 목록으로
        </Link>
      </section>
    </main>
  )
}
