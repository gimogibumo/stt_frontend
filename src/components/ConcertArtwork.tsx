interface ConcertArtworkProps {
  concertAt: string
  concertId: number
  title: string
  variant?: 'card' | 'detail'
}

export default function ConcertArtwork({
  concertAt,
  concertId,
  title,
  variant = 'card',
}: ConcertArtworkProps) {
  const [year = 'LIVE', month = '--', day = '--'] = concertAt
    .split('T')[0]
    .split('-')
  const artworkIndex = Math.abs(concertId) % 6

  return (
    <div
      className={`concert-artwork artwork-${artworkIndex} ${variant}`}
      aria-hidden="true"
    >
      <div className="artwork-orbit" />
      <div className="artwork-orbit orbit-two" />
      <div className="artwork-orbit orbit-three" />
      <div className="artwork-content">
        <span className="artwork-kicker">
          STT TICKET PRESENTS <span>↗</span>
        </span>
        <div className="artwork-title">
          <span>
            LIVE
            <br />
            ON STAGE
          </span>
          <strong>{title}</strong>
        </div>
        <div className="artwork-date">
          <span>
            {month}.{day}
          </span>
          <small>{year}</small>
        </div>
      </div>
      <span className="artwork-number">LIVE MUSIC · LIVE MOMENTS</span>
    </div>
  )
}
