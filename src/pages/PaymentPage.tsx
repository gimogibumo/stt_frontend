import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getErrorMessage } from '../api/apiClient'
import { payReservation } from '../api/reservationApi'
import type {
  CreateReservationResponse,
  PaymentResponse,
  Seat,
} from '../types/api'
import { formatCurrency, formatLocalDateTime } from '../utils/format'

interface LocationState {
  reservation?: CreateReservationResponse
  seat?: Seat
}

export default function PaymentPage() {
  const { reservationId: reservationIdParam } = useParams()
  const reservationId = Number(reservationIdParam)
  const location = useLocation()
  const locationState = location.state as LocationState | null
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      setError('올바르지 않은 예약 ID입니다.')
      return
    }

    setIsPaying(true)
    setError(null)

    try {
      setPayment(await payReservation(reservationId))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsPaying(false)
    }
  }

  if (payment) {
    return (
      <main className="page-stack narrow-page">
        <section className="result-card success-result">
          <div className="queue-icon success">✓</div>
          <p className="eyebrow">Payment complete</p>
          <h1>결제가 완료되었습니다.</h1>
          <dl className="summary-list centered-summary">
            <div><dt>결제 ID</dt><dd>#{payment.paymentId}</dd></div>
            <div><dt>예약 ID</dt><dd>#{payment.reservationId}</dd></div>
            <div><dt>결제 금액</dt><dd>{formatCurrency(payment.amount)}</dd></div>
            <div><dt>결제 상태</dt><dd>{payment.status}</dd></div>
          </dl>
          <div className="button-row centered">
            <Link className="button primary" to="/my/reservations">
              내 예약 확인
            </Link>
            <Link className="button secondary" to="/concerts">
              공연 목록
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page-stack narrow-page">
      <section className="detail-card">
        <p className="eyebrow">Payment</p>
        <h1>예약 결제</h1>
        <p className="page-description">
          현재 단계는 백엔드의 모의 결제 API를 호출합니다. 외부 PG 정보는 입력하지
          않습니다.
        </p>

        <dl className="summary-list payment-summary">
          <div><dt>예약 ID</dt><dd>#{reservationIdParam}</dd></div>
          {locationState?.seat && (
            <>
              <div>
                <dt>좌석</dt>
                <dd>{locationState.seat.section}구역 {locationState.seat.row}열 {locationState.seat.number}번</dd>
              </div>
              <div><dt>결제 예정 금액</dt><dd>{formatCurrency(locationState.seat.price)}</dd></div>
            </>
          )}
          {locationState?.reservation && (
            <div>
              <dt>예약 만료 시각</dt>
              <dd>{formatLocalDateTime(locationState.reservation.expiresAt)}</dd>
            </div>
          )}
        </dl>

        {!locationState?.reservation && (
          <div className="notice-banner">
            새로고침으로 예약 상세 정보는 복원할 수 없지만, URL의 예약 ID로 결제를
            계속할 수 있습니다.
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <button
          className="button primary full-width"
          type="button"
          disabled={isPaying}
          onClick={() => void handlePayment()}
        >
          {isPaying ? '결제 처리 중...' : '결제하기'}
        </button>
      </section>
    </main>
  )
}

