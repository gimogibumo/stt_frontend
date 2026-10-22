const steps = ['대기열 입장', '좌석 선택', '예매 · 결제', '예매 완료']

export default function BookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="booking-steps" aria-label="예매 진행 단계">
      {steps.map((label, index) => (
        <li
          key={label}
          className={
            index + 1 < current
              ? 'complete'
              : index + 1 === current
                ? 'current'
                : ''
          }
          aria-current={index + 1 === current ? 'step' : undefined}
        >
          <span aria-hidden="true">
            {index + 1 < current ? '✓' : `0${index + 1}`}
          </span>
          {label}
        </li>
      ))}
    </ol>
  )
}
