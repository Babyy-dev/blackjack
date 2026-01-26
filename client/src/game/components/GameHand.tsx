import { useMemo } from 'react'
import type { Hand, Player } from '../types'
import { useGameStore } from '../store'
import HandTotal from './HandTotal'
import HandBet from './HandBet'
import PlayingCard from './PlayingCard'

type GameHandProps = {
  hand: Hand
  player: Player
}

const GameHand = ({ hand, player }: GameHandProps) => {
  const activeHand = useGameStore((state) => state.activeHand)
  const activePlayer = useGameStore((state) => state.activePlayer)
  const showDealerHoleCard = useGameStore((state) => state.showDealerHoleCard)
  const isDealer = player.isDealer

  const isActiveHand = activeHand === hand && !player.isDealer
  const isSplitHand = useMemo(
    () => activePlayer === player && !!activeHand && player.hands.length > 1,
    [activeHand, activePlayer, player],
  )

  const isFaceDown = (cardIndex: number) => isDealer && cardIndex === 1 && !showDealerHoleCard

  const isSplitCard = (card: Card) => {
    if (player.hands.indexOf(hand) !== 1) return false
    return hand.cards.indexOf(card) === 0
  }

  return (
    <article className={`hand ${isActiveHand ? 'active-hand' : ''} ${isSplitHand ? 'split-hand' : ''}`}>
      <h2 className="sr-only">{isDealer ? "Dealer's" : 'Your'} hand</h2>
      {hand.cards.map((card, index) => (
        <PlayingCard
          key={`${hand.id}-${card.index}`}
          card={card}
          isFaceDown={isFaceDown(index)}
          className={isSplitCard(card) ? 'split-card' : ''}
        />
      ))}
      <HandBet hand={hand} />
      {!player.isDealer && (
        <div className="hand-result">
          {hand.result && (
            <svg className={hand.result === 'blackjack' ? 'blackjack' : ''}>
              <use href={`#result-${hand.result}`} />
            </svg>
          )}
        </div>
      )}
      <HandTotal hand={hand} isDealer={isDealer} />
    </article>
  )
}

export default GameHand
