import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getQueueStatus } from '../api/queueApi'
import type { QueueStatusResponse } from '../types/api'
import { useQueueStatus } from './useQueueStatus'

vi.mock('../api/queueApi', () => ({
  getQueueStatus: vi.fn(),
}))

const waiting: QueueStatusResponse = {
  concertId: 1,
  userId: 10,
  status: 'WAITING',
  position: 3,
  waitingCount: 8,
}

const admitted: QueueStatusResponse = {
  concertId: 1,
  userId: 10,
  status: 'ADMITTED',
  position: null,
  waitingCount: 0,
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('useQueueStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('WAITING 상태를 1초마다 확인하고 ADMITTED 이후 폴링을 중지한다', async () => {
    const getQueueStatusMock = vi.mocked(getQueueStatus)
    getQueueStatusMock
      .mockResolvedValueOnce(waiting)
      .mockResolvedValueOnce(admitted)

    const { result } = renderHook(() => useQueueStatus(1))
    await flushPromises()

    expect(result.current.data).toEqual(waiting)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(result.current.data).toEqual(admitted)
    expect(getQueueStatusMock).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })

    expect(getQueueStatusMock).toHaveBeenCalledTimes(2)
  })

  it('WAITING 중 일시 오류가 나면 2초 뒤 다시 확인한다', async () => {
    const getQueueStatusMock = vi.mocked(getQueueStatus)
    getQueueStatusMock
      .mockResolvedValueOnce(waiting)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(admitted)

    const { result } = renderHook(() => useQueueStatus(1))
    await flushPromises()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(result.current.data).toEqual(waiting)
    expect(result.current.error).toBe('temporary failure')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(result.current.data).toEqual(admitted)
    expect(result.current.error).toBeNull()
    expect(getQueueStatusMock).toHaveBeenCalledTimes(3)
  })
})
