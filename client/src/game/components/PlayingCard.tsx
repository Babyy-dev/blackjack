import { useMemo } from 'react'
import type { Card } from '../types'

const FACE_NAMES: Record<string, string> = {
  A: 'Ace',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
}

const SUIT_NAMES: Record<string, string> = {
  spades: 'Spades',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  hearts: 'Hearts',
}

type PlayingCardProps = {
  card: Card
  isFaceDown?: boolean
  className?: string
}

const PlayingCard = ({ card, isFaceDown = false, className }: PlayingCardProps) => {
  const symbolCount = useMemo(() => {
    const rankValue = String(card.rank)
    if (['J', 'Q', 'K', 'A', 'a'].includes(rankValue)) return 1
    const numeric = Number(rankValue)
    return Number.isFinite(numeric) ? numeric : 1
  }, [card.rank])

  const getCardLabel = () => {
    if (isFaceDown) return 'Face-down card'
    const rankKey = String(card.rank)
    const rank = FACE_NAMES[rankKey] ?? rankKey
    const suit = SUIT_NAMES[card.suit] ?? card.suit
    return `${rank} of ${suit}`
  }

  return (
    <div
      className={`card deal ${isFaceDown ? 'face-down' : ''} ${className ?? ''}`}
      data-rank={isFaceDown ? undefined : String(card.rank).toLowerCase()}
      data-suit={isFaceDown ? undefined : card.suit}
      role="img"
      aria-label={getCardLabel()}
    >
      <div className="card-face" role="presentation">
        {!isFaceDown && (
          <>
            <div className="card-corner">
              <span className="card-rank">{String(card.rank).toUpperCase()}</span>
              <svg>
                <use href={`#suit-${card.suit}`} />
              </svg>
            </div>
            <div className="card-center">
              {Array.from({ length: symbolCount }, (_, i) => (
                <svg key={i}>
                  <use href={`#suit-${card.suit}`} />
                </svg>
              ))}
            </div>
            <div className="card-corner">
              <span className="card-rank">{String(card.rank).toUpperCase()}</span>
              <svg className="card-suit">
                <use href={`#suit-${card.suit}`} />
              </svg>
            </div>
          </>
        )}
      </div>
      <div className="card-back" role="presentation">
        <svg>
          <use href="#flourish" />
        </svg>
      </div>
    </div>
  )
}

export default PlayingCard

