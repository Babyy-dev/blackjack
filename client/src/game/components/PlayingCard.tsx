import { useMemo } from 'react'
import type { Card } from '../types'

const FACE_NAMES: Record<string, string> = {
  A: 'Ace',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
}

const SUIT_NAMES: Record<string, string> = {
  '♠': 'Spades',
  '♦': 'Diamonds',
  '♣': 'Clubs',
  '♥': 'Hearts',
}

type PlayingCardProps = {
  card: Card
  isFaceDown?: boolean
  className?: string
}

const PlayingCard = ({ card, isFaceDown = false, className }: PlayingCardProps) => {
  const symbolCount = useMemo(() => {
    if (['J', 'Q', 'K', 'A', 'a'].includes(card.rank)) return 1
    return Number(card.rank)
  }, [card.rank])

  const getCardLabel = () => {
    if (isFaceDown) return 'Face-down card'
    const rank = FACE_NAMES[card.rank] ?? card.rank
    const suit = SUIT_NAMES[card.suit]
    return `${rank} of ${suit}`
  }

  return (
    <div
      className={`card deal ${isFaceDown ? 'face-down' : ''} ${className ?? ''}`}
      data-rank={isFaceDown ? undefined : card.rank.toLowerCase()}
      data-suit={isFaceDown ? undefined : card.suit}
      role="img"
      aria-label={getCardLabel()}
    >
      <div className="card-face" role="presentation">
        {!isFaceDown && (
          <>
            <div className="card-corner">
              <span className="card-rank">{card.rank.toUpperCase()}</span>
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
              <span className="card-rank">{card.rank.toUpperCase()}</span>
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
