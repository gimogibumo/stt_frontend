import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getConcerts } from '../api/concertApi'
import { getErrorMessage } from '../api/apiClient'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import ConcertArtwork from '../components/ConcertArtwork'
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
      <section className="concert-hero">
        <div className="hero-copy">
          <p className="eyebrow">YOUR NEXT LIVE MOMENT</p>
          <h1>
            기다리던 무대를
            <br />
            가장 먼저 만나세요
          </h1>
          <p>
            공연을 고르고 대기열에 참여하세요. 입장이 허용되면 원하는 좌석을
            직접 선택할 수 있습니다.
          </p>
          <div className="hero-count">
            <strong>{concerts.length.toLocaleString('ko-KR')}</strong>
            <span>개의 공연이 예매를 기다리고 있어요</span>
          </div>
        </div>
        <div className="hero-stage" aria-hidden="true">
          <div className="hero-ticket ticket-back">LIVE</div>
          <div className="hero-ticket ticket-front">
            <span>STT</span>
            <strong>MAKE<br />SOME<br />NOISE</strong>
            <small>ADMIT ONE</small>
          </div>
          <div className="hero-disc" />
        </div>
      </section>

      <section className="catalog-heading">
        <div>
          <p className="eyebrow">NOW BOOKING</p>
          <h2>지금 예매 가능한 공연</h2>
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
              <Link
                className="artwork-link"
                to={`/concerts/${concert.id}`}
                aria-label={`${concert.title} 상세 보기`}
              >
                <ConcertArtwork
                  concertAt={concert.concertAt}
                  concertId={concert.id}
                  title={concert.title}
                />
              </Link>
              <div className="concert-card-body">
                <span className="id-badge">CONCERT #{concert.id}</span>
                <h3>{concert.title}</h3>
                <dl className="metadata-list">
                  <div>
                    <dt>공연</dt>
                    <dd>{formatLocalDateTime(concert.concertAt)}</dd>
                  </div>
                  <div>
                    <dt>예매 오픈</dt>
                    <dd>{formatLocalDateTime(concert.reservationOpenAt)}</dd>
                  </div>
                </dl>
                <Link className="card-link" to={`/concerts/${concert.id}`}>
                  예매 정보 보기 <span aria-hidden="true">→</span>
                </Link>
              </div>
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

