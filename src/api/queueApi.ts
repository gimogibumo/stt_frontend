import { apiRequest } from './apiClient'
import type { QueueStatusResponse, WaitingQueueResponse } from '../types/api'

export function joinQueue(concertId: number): Promise<WaitingQueueResponse> {
  return apiRequest<WaitingQueueResponse>(`/api/queues/${concertId}/join`, {
    method: 'POST',
  })
}

export function getQueuePosition(
  concertId: number,
): Promise<WaitingQueueResponse> {
  return apiRequest<WaitingQueueResponse>(
    `/api/queues/${concertId}/position`,
  )
}

export function getQueueStatus(
  concertId: number,
): Promise<QueueStatusResponse> {
  return apiRequest<QueueStatusResponse>(`/api/queues/${concertId}/status`)
}

