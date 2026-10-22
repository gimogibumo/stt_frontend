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
  const [sort, setSort] = useState<'recent' | 'concertAt'>('recent')
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

    return [...result].sort((a, b) =>
      sort === 'concertAt'
        ? a.concertAt.localeCompare(b.concertAt) || b.id - a.id
        : b.id - a.id,
    )
  }, [concerts, search, sort])

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
    <main className="page-stack catalog-page">
      <section className="concert-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> FOR THE LOVE OF LIVE
          </p>
          <h1>
            그 순간, 그 무대.
            <br />
            <span>당신의 자리에서.</span>
          </h1>
          <p>
            화면 너머의 음악을 눈앞에서 만나는 순간.
            <br />
            오래 기억될 다음 공연을 찾아보세요.
          </p>
          <a className="button hero-button" href="#concert-catalog">
            공연 둘러보기 <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="hero-caption" aria-hidden="true">
          <span>
            LESS SCROLLING.
            <br />
            MORE SINGING.
          </span>
          <small>음악이 있는 곳, 우리가 만나는 곳.</small>
        </div>
      </section>

      <section className="discovery-strip" aria-label="예매 안내">
        <div>
          <span className="strip-icon" aria-hidden="true">
            ↗
          </span>
          <p>
            <strong>다음 공연을 발견하세요</strong>
            <span>설레는 만남은 한 장의 티켓에서</span>
          </p>
        </div>
        <Link to="/my/reservations">
          <span className="strip-icon" aria-hidden="true">
            ▤
          </span>
          <p>
            <strong>나의 티켓 모아보기</strong>
            <span>예매 내역과 결제를 한곳에서</span>
          </p>
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="catalog-heading" id="concert-catalog">
        <div>
          <p className="eyebrow">FIND YOUR NEXT LIVE</p>
          <h2>
            어떤 공연을 찾으세요?<span className="heading-dot">.</span>
          </h2>
          <p className="catalog-description">
            취향에 맞는 무대, 잊지 못할 하루.
          </p>
        </div>
        <label className="search-field">
          <span>공연 검색</span>
          <input
            type="search"
            placeholder="어떤 공연을 찾고 있나요?"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </section>

      <div className="catalog-toolbar">
        <p>
          전체 공연{' '}
          <strong>{filteredConcerts.length.toLocaleString('ko-KR')}</strong>
        </p>
        <label className="sort-field">
          정렬
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as 'recent' | 'concertAt')
              setPage(1)
            }}
          >
            <option value="recent">최근 등록순</option>
            <option value="concertAt">공연일순</option>
          </select>
        </label>
      </div>

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
                <span className="concert-category">LIVE CONCERT</span>
                <h3>
                  <Link to={`/concerts/${concert.id}`}>{concert.title}</Link>
                </h3>
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
                  상세 · 예매하기 <span aria-hidden="true">↗</span>
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
