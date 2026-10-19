import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../api/apiClient'
import { getMyReservations } from '../api/reservationApi'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import type { UserReservation } from '../types/api'
import { formatCurrency } from '../utils/format'

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<UserReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReservations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setReservations(await getMyReservations())
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadReservations()
  }, [])

  if (isLoading) {
    return <LoadingPanel message="예약 목록을 불러오고 있습니다." />
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={() => void loadReservations()} />
  }

  return (
    <main className="page-stack">
      <section className="page-heading">
        <p className="eyebrow">My Reservations</p>
        <h1>내 예약</h1>
        <p className="page-description">
          로그인한 사용자에게 속한 예약만 백엔드에서 조회합니다.
        </p>
      </section>

      {reservations.length === 0 ? (
        <section className="state-panel">
          <h2>아직 예약이 없습니다.</h2>
          <p>공연을 선택하고 예매를 시작해 보세요.</p>
          <Link className="button primary" to="/concerts">
            공연 보러 가기
          </Link>
        </section>
      ) : (
        <section className="reservation-list" aria-label="예약 목록">
          {reservations.map((reservation) => (
            <article className="reservation-card" key={reservation.reservationId}>
              <div>
                <span className={`status-chip ${reservation.status.toLowerCase()}`}>
                  {reservation.status}
                </span>
                <h2>{reservation.concertTitle}</h2>
                <p>
                  {reservation.section}구역 {reservation.row}열{' '}
                  {reservation.seatNumber}번
                </p>
              </div>
              <div className="reservation-price">
                <span>예약 #{reservation.reservationId}</span>
                <strong>{formatCurrency(reservation.price)}</strong>
                {reservation.status === 'PENDING' && (
                  <Link
                    className="compact-button"
                    to={`/reservations/${reservation.reservationId}/payment`}
                  >
                    결제하기
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

