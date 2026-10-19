import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../api/apiClient'
import { joinQueue } from '../api/queueApi'
import { ErrorPanel, LoadingPanel } from '../components/Feedback'
import { useQueueStatus } from '../hooks/useQueueStatus'

interface LocationState {
  message?: string
}

export default function QueuePage() {
  const { concertId: concertIdParam } = useParams()
  const concertId = Number(concertIdParam)
  const location = useLocation()
  const locationState = location.state as LocationState | null
  const { data, isLoading, error, refresh } = useQueueStatus(concertId)
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleJoin = async () => {
    setIsJoining(true)
    setJoinError(null)

    try {
      await joinQueue(concertId)
      refresh()
    } catch (requestError) {
      if (!(requestError instanceof ApiError && requestError.status === 401)) {
        setJoinError(getErrorMessage(requestError))
      }
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading && !data) {
    return <LoadingPanel message="대기열 상태를 복원하고 있습니다." />
  }

  if (error && !data) {
    return (
      <ErrorPanel
        title="대기열 상태를 확인하지 못했습니다."
        message={error}
        onRetry={refresh}
      />
    )
  }

  return (
    <main className="page-stack narrow-page">
      <Link className="back-link" to={`/concerts/${concertId}`}>
        ← 공연 상세
      </Link>

      <section className="queue-card" aria-live="polite">
        <div className="queue-card-heading">
          <p className="eyebrow">TICKET QUEUE</p>
          <h1>예매 대기열</h1>
          <p>접속 순서에 따라 안전하게 예매 페이지로 안내합니다.</p>
        </div>

        <ol className="booking-steps" aria-label="예매 진행 단계">
          <li className="complete"><span>1</span>공연 선택</li>
          <li className={data?.status === 'ADMITTED' ? 'complete' : 'current'}>
            <span>2</span>대기열
          </li>
          <li className={data?.status === 'ADMITTED' ? 'current' : ''}>
            <span>3</span>좌석 선택
          </li>
        </ol>

        {locationState?.message && (
          <div className="notice-banner">{locationState.message}</div>
        )}

        {error && data?.status === 'WAITING' && (
          <div className="warning-banner" role="alert">
            일시적으로 상태를 확인하지 못했습니다. 자동으로 다시 시도합니다.
          </div>
        )}

        {data?.status === 'NOT_JOINED' && (
          <div className="queue-state">
            <div className="queue-icon">01</div>
            <h2>아직 대기열에 참여하지 않았습니다.</h2>
            <p>대기열에 참여하면 서버가 순서대로 예매 입장을 허용합니다.</p>
            {joinError && (
              <div className="error-banner" role="alert">
                {joinError}
              </div>
            )}
            <button
              className="button primary"
              type="button"
              disabled={isJoining}
              onClick={() => void handleJoin()}
            >
              {isJoining ? '참여 중...' : '대기열 참여'}
            </button>
          </div>
        )}

        {data?.status === 'WAITING' && (
          <div className="queue-state">
            <span className="spinner large" aria-hidden="true" />
            <p className="status-label">현재 대기 순서</p>
            <strong className="queue-position">
              {data.position === null ? '-' : `${data.position}번째`}
            </strong>
            <p>
              전체 대기 인원 {data.waitingCount.toLocaleString('ko-KR')}명 · 약 1초마다
              갱신
            </p>
            <p className="muted-text">
              이 페이지를 새로고침하거나 나갔다 돌아와도 서버 상태에서 복원됩니다.
            </p>
          </div>
        )}

        {data?.status === 'ADMITTED' && (
          <div className="queue-state admitted-state">
            <div className="queue-icon success">✓</div>
            <h2>예매 입장이 허용되었습니다.</h2>
            <p>입장 시간은 제한되어 있습니다. 좌석을 선택해 주세요.</p>
            <Link className="button primary" to={`/concerts/${concertId}/seats`}>
              좌석 선택하기
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}

