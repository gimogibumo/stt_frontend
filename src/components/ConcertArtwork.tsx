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
      <div className="artwork-light light-one" />
      <div className="artwork-light light-two" />
      <div className="artwork-content">
        <span className="artwork-kicker">LIVE PERFORMANCE</span>
        <strong>{title}</strong>
        <div className="artwork-date">
          <span>{month}.{day}</span>
          <small>{year}</small>
        </div>
      </div>
      <span className="artwork-number">NO. {concertId}</span>
    </div>
  )
}
