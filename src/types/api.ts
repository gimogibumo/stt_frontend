export interface AuthenticatedUser {
  id: number
  email: string
  name: string
}

export interface SignupRequest {
  email: string
  password: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface Concert {
  id: number
  title: string
  reservationOpenAt: string
  concertAt: string
}

export type QueueStatus = 'NOT_JOINED' | 'WAITING' | 'ADMITTED'

export interface WaitingQueueResponse {
  concertId: number
  userId: number
  position: number
  waitingCount: number
}

export interface QueueStatusResponse {
  concertId: number
  userId: number
  status: QueueStatus
  position: number | null
  waitingCount: number
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD'

export interface Seat {
  seatId: number
  section: string
  row: number
  number: number
  price: number
  status: SeatStatus
}

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface CreateReservationRequest {
  concertId: number
  seatId: number
}

export interface CreateReservationResponse {
  reservationId: number
  seatId: number
  status: ReservationStatus
  expiresAt: string
}

export interface ReservationDetail {
  reservationId: number
  concertTitle: string
  section: string
  row: number
  seatNumber: number
  price: number
  status: ReservationStatus
  expiresAt: string
}

export type PaymentStatus = 'READY' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

export interface PaymentResponse {
  paymentId: number
  reservationId: number
  status: PaymentStatus
  amount: number
}

export interface UserReservation {
  reservationId: number
  concertTitle: string
  section: string
  row: number
  seatNumber: number
  price: number
  status: ReservationStatus
}

