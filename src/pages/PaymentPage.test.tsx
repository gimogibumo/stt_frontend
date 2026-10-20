import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReservation, payReservation } from '../api/reservationApi'
import type { ReservationDetail } from '../types/api'
import PaymentPage from './PaymentPage'

vi.mock('../api/reservationApi', () => ({
  getReservation: vi.fn(),
  payReservation: vi.fn(),
}))

const pendingReservation: ReservationDetail = {
  reservationId: 1001,
  concertTitle: 'Survive the Traffic Live',
  section: 'A',
  row: 3,
  seatNumber: 12,
  price: 150_000,
  status: 'PENDING',
  expiresAt: '2026-10-20T14:30:00',
}

function renderPaymentPage() {
  render(
    <MemoryRouter initialEntries={['/reservations/1001/payment']}>
      <Routes>
        <Route
          path="/reservations/:reservationId/payment"
          element={<PaymentPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.mocked(getReservation).mockResolvedValue(pendingReservation)
  })

  it('URL의 예약 ID로 상세 정보를 복원하고 결제한다', async () => {
    vi.mocked(payReservation).mockResolvedValue({
      paymentId: 5001,
      reservationId: 1001,
      status: 'SUCCESS',
      amount: 150_000,
    })
    const user = userEvent.setup()

    renderPaymentPage()

    expect(
      await screen.findByRole('heading', { name: '예약 결제' }),
    ).toBeInTheDocument()
    expect(getReservation).toHaveBeenCalledWith(1001)
    expect(screen.getByText('Survive the Traffic Live')).toBeInTheDocument()
    expect(screen.getByText(/A구역 3열/)).toHaveTextContent('A구역 3열 12번')
    expect(screen.getByText('2026.10.20 14:30')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '150,000원 결제하기' }))

    expect(payReservation).toHaveBeenCalledWith(1001)
    expect(
      await screen.findByRole('heading', { name: '결제가 완료되었습니다.' }),
    ).toBeInTheDocument()
  })

  it('이미 확정된 예약은 다시 결제하지 못하게 한다', async () => {
    vi.mocked(getReservation).mockResolvedValue({
      ...pendingReservation,
      status: 'CONFIRMED',
    })

    renderPaymentPage()

    expect(
      await screen.findByText('이미 결제가 완료된 예약입니다.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /결제하기/ }),
    ).not.toBeInTheDocument()
    expect(payReservation).not.toHaveBeenCalled()
  })
})
