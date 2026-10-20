import { apiRequest } from './apiClient'
import type {
  CreateReservationRequest,
  CreateReservationResponse,
  PaymentResponse,
  ReservationDetail,
  UserReservation,
} from '../types/api'

export function createReservation(
  request: CreateReservationRequest,
): Promise<CreateReservationResponse> {
  return apiRequest<CreateReservationResponse>('/api/reservations', {
    method: 'POST',
    body: request,
  })
}

export function payReservation(
  reservationId: number,
): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>(
    `/api/reservations/${reservationId}/payments`,
    { method: 'POST' },
  )
}

export function getReservation(
  reservationId: number,
): Promise<ReservationDetail> {
  return apiRequest<ReservationDetail>(`/api/reservations/${reservationId}`)
}

export function getMyReservations(): Promise<UserReservation[]> {
  return apiRequest<UserReservation[]>('/api/users/me/reservations')
}

