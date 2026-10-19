interface LoadingPanelProps {
  message?: string
}

export function LoadingPanel({
  message = '불러오는 중입니다.',
}: LoadingPanelProps) {
  return (
    <section className="state-panel" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </section>
  )
}

interface ErrorPanelProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorPanel({
  title = '요청을 처리하지 못했습니다.',
  message,
  onRetry,
}: ErrorPanelProps) {
  return (
    <section className="state-panel error-panel" role="alert">
      <p className="eyebrow">Error</p>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button className="button secondary" type="button" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </section>
  )
}

