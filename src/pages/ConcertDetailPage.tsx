import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getConcert } from '../api/concertApi'
import { getErrorMessage } from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
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
    <main className="page-stack narrow-page">
      <Link className="back-link" to="/concerts">
        ← 공연 목록
      </Link>

      <article className="detail-card">
        <span className="id-badge">Concert #{concert.id}</span>
        <h1>{concert.title}</h1>
        <dl className="detail-metadata">
          <div>
            <dt>예매 시작</dt>
            <dd>{formatLocalDateTime(concert.reservationOpenAt)}</dd>
          </div>
          <div>
            <dt>공연 일시</dt>
            <dd>{formatLocalDateTime(concert.concertAt)}</dd>
          </div>
        </dl>

        <div className="action-panel">
          <div>
            <strong>예매 대기열</strong>
            <p>좌석 선택 전 서버 대기열을 거쳐 입장 상태를 확인합니다.</p>
          </div>
          <Link
            className="button primary"
            to={user ? `/concerts/${concert.id}/queue` : '/login'}
            state={user ? undefined : { from: { pathname: `/concerts/${concert.id}/queue` } }}
          >
            {user ? '예매 시작' : '로그인하고 예매'}
          </Link>
        </div>
      </article>
    </main>
  )
}

