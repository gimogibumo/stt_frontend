import { apiRequest } from './apiClient'
import type {
  CreateReservationRequest,
  CreateReservationResponse,
  PaymentResponse,
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

export function getMyReservations(): Promise<UserReservation[]> {
  return apiRequest<UserReservation[]>('/api/users/me/reservations')
}

