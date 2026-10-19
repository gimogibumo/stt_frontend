import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../api/apiClient'
import { getConcertSeats } from '../api/concertApi'
import { getQueueStatus } from '../api/queueApi'
import { createReservation } from '../api/reservationApi'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import type { QueueStatusResponse, Seat } from '../types/api'
import { formatCurrency } from '../utils/format'

const SEAT_PAGE_SIZE = 80

export default function SeatsPage() {
  const { concertId: concertIdParam } = useParams()
  const concertId = Number(concertIdParam)
  const navigate = useNavigate()
  const [admission, setAdmission] = useState<QueueStatusResponse | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReserving, setIsReserving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reservationError, setReservationError] = useState<string | null>(null)
  const [seatSearch, setSeatSearch] = useState('')
  const [seatPage, setSeatPage] = useState(1)

  const loadPage = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const status = await getQueueStatus(concertId)
      setAdmission(status)

      if (status.status === 'ADMITTED') {
        setSeats(await getConcertSeats(concertId))
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
  }, [concertId])

  const selectedSeat = useMemo(
    () => seats.find((seat) => seat.seatId === selectedSeatId) || null,
    [seats, selectedSeatId],
  )

  const filteredSeats = useMemo(() => {
    const keyword = seatSearch.trim().toLowerCase()

    if (!keyword) {
      return seats
    }

    return seats.filter((seat) =>
      [
        seat.section,
        `${seat.row}-${seat.number}`,
        `${seat.row}열 ${seat.number}번`,
        String(seat.seatId),
      ].some((value) => value.toLowerCase().includes(keyword)),
    )
  }, [seats, seatSearch])

  const totalSeatPages = Math.max(
    1,
    Math.ceil(filteredSeats.length / SEAT_PAGE_SIZE),
  )
  const safeSeatPage = Math.min(seatPage, totalSeatPages)
  const visibleSeats = filteredSeats.slice(
    (safeSeatPage - 1) * SEAT_PAGE_SIZE,
    safeSeatPage * SEAT_PAGE_SIZE,
  )

  const handleReservation = async () => {
    if (!selectedSeat) {
      return
    }

    setIsReserving(true)
    setReservationError(null)

    try {
      const reservation = await createReservation({
        concertId,
        seatId: selectedSeat.seatId,
      })

      navigate(`/reservations/${reservation.reservationId}/payment`, {
        state: { reservation, seat: selectedSeat },
      })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        setReservationError(
          '다른 사용자가 해당 좌석을 먼저 예약했습니다. 좌석 상태를 새로 불러왔습니다.',
        )
        setSelectedSeatId(null)
        try {
          setSeats(await getConcertSeats(concertId))
        } catch (refreshError) {
          setReservationError(getErrorMessage(refreshError))
        }
      } else if (
        requestError instanceof ApiError &&
        requestError.code === 'ADMISSION_REQUIRED'
      ) {
        navigate(`/concerts/${concertId}/queue`, {
          replace: true,
          state: { message: '예매 입장 시간이 만료되었습니다. 대기열에 다시 참여해 주세요.' },
        })
      } else {
        setReservationError(getErrorMessage(requestError))
      }
    } finally {
      setIsReserving(false)
    }
  }

  if (isLoading) {
    return <LoadingPanel message="입장 상태와 좌석을 확인하고 있습니다." />
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={() => void loadPage()} />
  }

  if (admission?.status !== 'ADMITTED') {
    return (
      <Navigate
        replace
        to={`/concerts/${concertId}/queue`}
        state={{ message: '좌석을 선택하려면 먼저 대기열 입장이 필요합니다.' }}
      />
    )
  }

  return (
    <main className="page-stack">
      <section className="page-heading">
        <Link className="back-link" to={`/concerts/${concertId}/queue`}>
          ← 대기열 상태
        </Link>
        <p className="eyebrow">Seat Selection</p>
        <h1>좌석 선택</h1>
        <p className="page-description">
          화면의 좌석 상태는 실시간으로 바뀔 수 있습니다. 예약 요청이 성공해야 좌석이
          확보됩니다.
        </p>
      </section>

      {reservationError && (
        <div className="error-banner" role="alert">
          {reservationError}
        </div>
      )}

      {seats.length === 0 ? (
        <section className="state-panel">
          <h2>등록된 좌석이 없습니다.</h2>
          <p>이 공연에는 현재 백엔드가 제공하는 좌석 데이터가 없습니다.</p>
        </section>
      ) : (
        <div className="seat-layout">
          <section className="seat-panel auditorium" aria-label="좌석 목록">
            <div className="stage">STAGE</div>
            <div className="seat-toolbar">
              <label className="search-field">
                <span>좌석 검색</span>
                <input
                  type="search"
                  placeholder="구역, 좌석 번호 또는 좌석 ID"
                  value={seatSearch}
                  onChange={(event) => {
                    setSeatSearch(event.target.value)
                    setSeatPage(1)
                  }}
                />
              </label>
              <span>
                {filteredSeats.length.toLocaleString('ko-KR')} /{' '}
                {seats.length.toLocaleString('ko-KR')}석
              </span>
            </div>
            <div className="seat-legend">
              <span><i className="available" /> 선택 가능</span>
              <span><i className="held" /> 임시 예약</span>
              <span><i className="sold" /> 판매 완료</span>
            </div>
            <div className="seat-grid">
              {visibleSeats.map((seat) => {
                const isSelected = seat.seatId === selectedSeatId
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`seat ${seat.status.toLowerCase()}${isSelected ? ' selected' : ''}`}
                    disabled={seat.status !== 'AVAILABLE'}
                    key={seat.seatId}
                    title={`${seat.section}구역 ${seat.row}열 ${seat.number}번`}
                    type="button"
                    onClick={() => setSelectedSeatId(seat.seatId)}
                  >
                    <strong>{seat.section}</strong>
                    <span>{seat.row}-{seat.number}</span>
                  </button>
                )
              })}
            </div>
            {visibleSeats.length === 0 && (
              <div className="empty-inline">검색 조건에 맞는 좌석이 없습니다.</div>
            )}
            {totalSeatPages > 1 && (
              <nav className="pagination seat-pagination" aria-label="좌석 목록 페이지">
                <button
                  type="button"
                  disabled={safeSeatPage === 1}
                  onClick={() =>
                    setSeatPage((current) => Math.max(1, current - 1))
                  }
                >
                  이전
                </button>
                <span>{safeSeatPage} / {totalSeatPages}</span>
                <button
                  type="button"
                  disabled={safeSeatPage === totalSeatPages}
                  onClick={() =>
                    setSeatPage((current) =>
                      Math.min(totalSeatPages, current + 1),
                    )
                  }
                >
                  다음
                </button>
              </nav>
            )}
          </section>

          <aside className="selection-card">
            <p className="eyebrow">Selected</p>
            <h2>선택 좌석</h2>
            {selectedSeat ? (
              <>
                <dl className="summary-list">
                  <div><dt>구역</dt><dd>{selectedSeat.section}</dd></div>
                  <div><dt>좌석</dt><dd>{selectedSeat.row}열 {selectedSeat.number}번</dd></div>
                  <div><dt>가격</dt><dd>{formatCurrency(selectedSeat.price)}</dd></div>
                </dl>
                <button
                  className="button primary full-width"
                  type="button"
                  disabled={isReserving}
                  onClick={() => void handleReservation()}
                >
                  {isReserving ? '예약 요청 중...' : '이 좌석 예약하기'}
                </button>
              </>
            ) : (
              <p className="muted-text">선택 가능한 좌석을 눌러 주세요.</p>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}

