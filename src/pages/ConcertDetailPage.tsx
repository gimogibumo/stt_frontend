import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getConcert } from '../api/concertApi'
import { getErrorMessage } from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import ConcertArtwork from '../components/ConcertArtwork'
import type { Concert } from '../types/api'
import { formatLocalDateTime } from '../utils/format'

export default function ConcertDetailPage() {
  const { concertId: concertIdParam } = useParams()
  const concertId = Number(concertIdParam)
  const { user } = useAuth()
  const [concert, setConcert] = useState<Concert | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConcert = async () => {
    if (!Number.isInteger(concertId) || concertId <= 0) {
      setError('올바르지 않은 공연 ID입니다.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setConcert(await getConcert(concertId))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadConcert()
  }, [concertId])

  if (isLoading) {
    return <LoadingPanel message="공연 정보를 불러오고 있습니다." />
  }

  if (error || !concert) {
    return (
      <ErrorPanel
        message={error || '공연 정보를 찾을 수 없습니다.'}
        onRetry={() => void loadConcert()}
      />
    )
  }

  return (
    <main className="page-stack detail-page">
      <Link className="back-link" to="/concerts">
        ← 공연 목록
      </Link>

      <article className="concert-detail-layout">
        <div className="detail-artwork-wrap">
          <ConcertArtwork
            concertAt={concert.concertAt}
            concertId={concert.id}
            title={concert.title}
            variant="detail"
          />
          <p>공연 정보는 실제 백엔드 데이터를 기준으로 표시됩니다.</p>
        </div>

        <section className="detail-card">
          <span className="id-badge">CONCERT #{concert.id}</span>
          <h1>{concert.title}</h1>
          <p className="detail-lead">
            한정된 입장 시간 안에 원하는 좌석을 선택해 예매하세요.
          </p>
          <dl className="detail-metadata">
            <div>
              <dt>공연 일시</dt>
              <dd>{formatLocalDateTime(concert.concertAt)}</dd>
            </div>
            <div>
              <dt>예매 시작</dt>
              <dd>{formatLocalDateTime(concert.reservationOpenAt)}</dd>
            </div>
            <div>
              <dt>예매 방식</dt>
              <dd>대기열 입장 후 좌석 선택</dd>
            </div>
          </dl>

          <div className="booking-guide">
            <span>01</span>
            <div>
              <strong>대기열 입장</strong>
              <p>서버가 순서대로 예매 접근을 허용합니다.</p>
            </div>
          </div>
          <Link
            className="button primary full-width booking-button"
            to={user ? `/concerts/${concert.id}/queue` : '/login'}
            state={
              user
                ? undefined
                : { from: { pathname: `/concerts/${concert.id}/queue` } }
            }
          >
            {user ? '예매 대기열 입장하기' : '로그인하고 예매하기'}
          </Link>
          <p className="booking-footnote">
            좌석은 예약 요청이 완료된 시점에 확보됩니다.
          </p>
        </section>
      </article>
    </main>
  )
}

