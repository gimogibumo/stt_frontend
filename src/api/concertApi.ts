import { apiRequest } from './apiClient'
import type { Concert, Seat } from '../types/api'

export function getConcerts(): Promise<Concert[]> {
  return apiRequest<Concert[]>('/api/concerts')
}

export function getConcert(concertId: number): Promise<Concert> {
  return apiRequest<Concert>(`/api/concerts/${concertId}`)
}

export function getConcertSeats(concertId: number): Promise<Seat[]> {
  return apiRequest<Seat[]>(`/api/concerts/${concertId}/seats`)
}

