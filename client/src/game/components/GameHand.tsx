import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import type { Card, Hand, Player } from '../types'
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
  const handRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const container = handRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cards = container.querySelectorAll('.card')
    if (!cards.length) return
    gsap.fromTo(
      cards,
      { y: -50, opacity: 0, rotation: -6, scale: 0.94 },
      { y: 0, opacity: 1, rotation: 0, scale: 1, stagger: 0.04, duration: 0.35, ease: 'power2.out' },
    )
  }, [hand.cards.length])

  useEffect(() => {
    if (!hand.result) return
    const container = handRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(
      container,
      { scale: 1 },
      { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.out' },
    )
  }, [hand.result])

  return (
    <article
      ref={handRef}
      className={`hand ${isActiveHand ? 'active-hand' : ''} ${isSplitHand ? 'split-hand' : ''}`}
    >
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
