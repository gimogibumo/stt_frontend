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
          <p>STT TICKET · LIVE ON STAGE</p>
        </div>

        <section className="detail-card">
          <span className="concert-category">LIVE CONCERT</span>
          <h1>{concert.title}</h1>
          <p className="detail-lead">
            기다려 온 공연, 이제 당신의 자리를 만나보세요.
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
              <p>차례가 되면 좌석을 선택할 수 있습니다.</p>
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

      <section className="booking-notes" aria-labelledby="booking-notes-title">
        <p className="eyebrow">BEFORE YOU BOOK</p>
        <h2 id="booking-notes-title">예매 전 확인해 주세요</h2>
        <div className="booking-notes-grid">
          <div>
            <span>01</span>
            <h3>대기열 입장</h3>
            <p>
              로그인 후 대기열에 참여해 주세요. 순서가 되면 좌석 선택을 시작할
              수 있습니다.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>좌석 선택</h3>
            <p>
              좌석 현황은 변동될 수 있습니다. 예약이 완료되어야 선택한 좌석이
              확보됩니다.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>결제 및 확인</h3>
            <p>
              안내된 결제 기한 안에 결제를 완료해 주세요. 예매 내역은
              마이티켓에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
