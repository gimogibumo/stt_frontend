import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/apiClient'
import { getConcertSeats } from '../api/concertApi'
import { getQueueStatus } from '../api/queueApi'
import { createReservation } from '../api/reservationApi'
import type { Seat } from '../types/api'
import SeatsPage from './SeatsPage'

vi.mock('../api/concertApi', () => ({
  getConcertSeats: vi.fn(),
}))

vi.mock('../api/queueApi', () => ({
  getQueueStatus: vi.fn(),
}))

vi.mock('../api/reservationApi', () => ({
  createReservation: vi.fn(),
}))

const availableSeat: Seat = {
  seatId: 101,
  section: 'A',
  row: 1,
  number: 1,
  price: 50_000,
  status: 'AVAILABLE',
}

describe('SeatsPage', () => {
  beforeEach(() => {
    vi.mocked(getQueueStatus).mockResolvedValue({
      concertId: 1,
      userId: 10,
      status: 'ADMITTED',
      position: null,
      waitingCount: 0,
    })
    vi.mocked(getConcertSeats).mockResolvedValue([availableSeat])
  })

  it('예약 충돌을 알리고 최신 좌석 상태를 다시 조회한다', async () => {
    vi.mocked(createReservation).mockRejectedValue(
      new ApiError(409, '이미 예약된 좌석입니다.', 'SEAT_ALREADY_RESERVED'),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/concerts/1/seats']}>
        <Routes>
          <Route path="/concerts/:concertId/seats" element={<SeatsPage />} />
          <Route
            path="/concerts/:concertId/queue"
            element={<h1>예매 대기열</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )

    const seatButton = await screen.findByRole('button', { name: /A 1-1/ })
    await user.click(seatButton)
    await user.click(screen.getByRole('button', { name: '이 좌석 예약하기' }))

    expect(
      await screen.findByText(/다른 사용자가 해당 좌석을 먼저 예약했습니다/),
    ).toBeInTheDocument()
    await waitFor(() => expect(getConcertSeats).toHaveBeenCalledTimes(2))
    expect(seatButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('입장 권한이 만료되면 구조화된 403 코드를 확인해 대기열로 이동한다', async () => {
    vi.mocked(createReservation).mockRejectedValue(
      new ApiError(403, '예매 입장이 필요합니다.', 'ADMISSION_REQUIRED'),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/concerts/1/seats']}>
        <Routes>
          <Route path="/concerts/:concertId/seats" element={<SeatsPage />} />
          <Route
            path="/concerts/:concertId/queue"
            element={<h1>예매 대기열</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /A 1-1/ }))
    await user.click(screen.getByRole('button', { name: '이 좌석 예약하기' }))

    expect(
      await screen.findByRole('heading', { name: '예매 대기열' }),
    ).toBeInTheDocument()
    expect(createReservation).toHaveBeenCalledTimes(1)
  })
})
