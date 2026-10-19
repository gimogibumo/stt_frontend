import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getConcerts } from '../api/concertApi'
import { getErrorMessage } from '../api/apiClient'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import type { Concert } from '../types/api'
import { formatLocalDateTime } from '../utils/format'

const PAGE_SIZE = 12

export default function ConcertListPage() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConcerts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setConcerts(await getConcerts())
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadConcerts()
  }, [])

  const filteredConcerts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const result = keyword
      ? concerts.filter(
          (concert) =>
            concert.title.toLowerCase().includes(keyword) ||
            String(concert.id).includes(keyword),
        )
      : concerts

    return [...result].sort((a, b) => b.id - a.id)
  }, [concerts, search])

  const totalPages = Math.max(1, Math.ceil(filteredConcerts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleConcerts = filteredConcerts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  if (isLoading) {
    return <LoadingPanel message="공연 목록을 불러오고 있습니다." />
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={() => void loadConcerts()} />
  }

  return (
    <main className="page-stack">
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">Concerts</p>
          <h1>공연을 선택하세요</h1>
          <p className="page-description">
            백엔드에서 제공한 실제 공연 {concerts.length}개를 조회했습니다.
          </p>
        </div>

        <label className="search-field">
          <span>공연 검색</span>
          <input
            type="search"
            placeholder="제목 또는 공연 ID"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </section>

      {visibleConcerts.length === 0 ? (
        <section className="state-panel">
          <h2>검색 결과가 없습니다.</h2>
          <p>다른 제목이나 공연 ID를 입력해 주세요.</p>
        </section>
      ) : (
        <section className="card-grid" aria-label="공연 목록">
          {visibleConcerts.map((concert) => (
            <article className="concert-card" key={concert.id}>
              <span className="id-badge">#{concert.id}</span>
              <h2>{concert.title}</h2>
              <dl className="metadata-list">
                <div>
                  <dt>예매 시작</dt>
                  <dd>{formatLocalDateTime(concert.reservationOpenAt)}</dd>
                </div>
                <div>
                  <dt>공연 일시</dt>
                  <dd>{formatLocalDateTime(concert.concertAt)}</dd>
                </div>
              </dl>
              <Link className="card-link" to={`/concerts/${concert.id}`}>
                상세 보기 <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="공연 목록 페이지">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            이전
          </button>
          <span>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            다음
          </button>
        </nav>
      )}
    </main>
  )
}

