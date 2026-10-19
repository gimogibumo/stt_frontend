import { useCallback, useEffect, useRef, useState } from 'react'
import { getQueueStatus } from '../api/queueApi'
import { getErrorMessage } from '../api/apiClient'
import type { QueueStatusResponse } from '../types/api'

interface QueueStatusState {
  data: QueueStatusResponse | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

const POLL_INTERVAL_MS = 1_000
const RETRY_INTERVAL_MS = 2_000

export function useQueueStatus(concertId: number): QueueStatusState {
  const [data, setData] = useState<QueueStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const lastStatus = useRef<QueueStatusResponse | null>(null)

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!Number.isInteger(concertId) || concertId <= 0) {
      setError('올바르지 않은 공연 ID입니다.')
      setIsLoading(false)
      return
    }

    let active = true
    let timer: number | undefined

    const schedule = (delay: number) => {
      timer = window.setTimeout(() => void poll(), delay)
    }

    const poll = async () => {
      try {
        const response = await getQueueStatus(concertId)

        if (!active) {
          return
        }

        lastStatus.current = response
        setData(response)
        setError(null)
        setIsLoading(false)

        if (response.status === 'WAITING') {
          schedule(POLL_INTERVAL_MS)
        }
      } catch (requestError) {
        if (!active) {
          return
        }

        setError(getErrorMessage(requestError))
        setIsLoading(false)

        if (lastStatus.current?.status === 'WAITING') {
          schedule(RETRY_INTERVAL_MS)
        }
      }
    }

    setIsLoading(true)
    setError(null)
    void poll()

    return () => {
      active = false
      if (timer !== undefined) {
        window.clearTimeout(timer)
      }
    }
  }, [concertId, refreshKey])

  return { data, isLoading, error, refresh }
}

