import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage } from '../api/apiClient'
import { getReservation, payReservation } from '../api/reservationApi'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import type { PaymentResponse, ReservationDetail } from '../types/api'
import { formatCurrency, formatLocalDateTime } from '../utils/format'

const unavailableMessages: Partial<Record<ReservationDetail['status'], string>> = {
  CONFIRMED: '이미 결제가 완료된 예약입니다.',
  CANCELLED: '취소된 예약은 결제할 수 없습니다.',
  EXPIRED: '결제 가능 시간이 만료된 예약입니다.',
}

export default function PaymentPage() {
  const { reservationId: reservationIdParam } = useParams()
  const reservationId = Number(reservationIdParam)
  const [reservation, setReservation] = useState<ReservationDetail | null>(null)
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const loadReservation = useCallback(async () => {
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      setReservation(null)
      setLoadError('올바르지 않은 예약 ID입니다.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      setReservation(await getReservation(reservationId))
    } catch (requestError) {
      setReservation(null)
      setLoadError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [reservationId])

  useEffect(() => {
    void loadReservation()
  }, [loadReservation])

  const handlePayment = async () => {
    if (!reservation || reservation.status !== 'PENDING') {
      return
    }

    setIsPaying(true)
    setPaymentError(null)

    try {
      setPayment(await payReservation(reservation.reservationId))
    } catch (requestError) {
      setPaymentError(getErrorMessage(requestError))
    } finally {
      setIsPaying(false)
    }
  }

  if (isLoading) {
    return <LoadingPanel message="예약 정보를 불러오고 있습니다." />
  }

  if (loadError || !reservation) {
    return (
      <ErrorPanel
        title="예약 정보를 확인하지 못했습니다."
        message={loadError || '예약 정보를 찾을 수 없습니다.'}
        onRetry={() => void loadReservation()}
      />
    )
  }

  if (payment) {
    return (
      <main className="page-stack narrow-page">
        <section className="result-card success-result">
          <div className="queue-icon success">✓</div>
          <p className="eyebrow">Payment complete</p>
          <h1>결제가 완료되었습니다.</h1>
          <dl className="summary-list centered-summary">
            <div><dt>공연</dt><dd>{reservation.concertTitle}</dd></div>
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

  const unavailableMessage = unavailableMessages[reservation.status]

  return (
    <main className="page-stack narrow-page">
      <section className="detail-card payment-card">
        <div className="payment-heading">
          <div>
            <p className="eyebrow">Payment</p>
            <h1>예약 결제</h1>
          </div>
          <span className={`status-chip ${reservation.status.toLowerCase()}`}>
            {reservation.status}
          </span>
        </div>
        <p className="page-description">
          예약 내용을 확인한 뒤 결제를 진행해 주세요. 현재 단계는 백엔드의 모의
          결제 API를 사용합니다.
        </p>

        <dl className="summary-list payment-summary">
          <div><dt>공연</dt><dd>{reservation.concertTitle}</dd></div>
          <div><dt>예약 ID</dt><dd>#{reservation.reservationId}</dd></div>
          <div>
            <dt>좌석</dt>
            <dd>
              {reservation.section}구역 {reservation.row}열{' '}
              {reservation.seatNumber}번
            </dd>
          </div>
          <div>
            <dt>결제 금액</dt>
            <dd>{formatCurrency(reservation.price)}</dd>
          </div>
          <div>
            <dt>결제 기한</dt>
            <dd>{formatLocalDateTime(reservation.expiresAt)}</dd>
          </div>
        </dl>

        {unavailableMessage && (
          <div className="notice-banner" role="status">
            {unavailableMessage}
          </div>
        )}

        {paymentError && (
          <div className="error-banner" role="alert">
            {paymentError}
          </div>
        )}

        {reservation.status === 'PENDING' ? (
          <button
            className="button primary full-width"
            type="button"
            disabled={isPaying}
            onClick={() => void handlePayment()}
          >
            {isPaying
              ? '결제 처리 중...'
              : `${formatCurrency(reservation.price)} 결제하기`}
          </button>
        ) : (
          <Link className="button secondary full-width" to="/my/reservations">
            내 예약으로 돌아가기
          </Link>
        )}
      </section>
    </main>
  )
}
