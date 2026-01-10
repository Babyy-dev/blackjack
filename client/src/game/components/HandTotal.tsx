import { useMemo } from 'react'
import { useGameStore } from '../store'
import type { Hand } from '../types'

const HandTotal = ({ hand }: { hand: Hand }) => {
  const players = useGameStore((state) => state.players)
  const showDealerHoleCard = useGameStore((state) => state.showDealerHoleCard)

  const total = useMemo(() => {
    if (hand.cards.length < 2) return null
    const dealer = players[players.length - 1]
    const isDealer = dealer?.hands.includes(hand)
    if (isDealer && !showDealerHoleCard) return null
    return hand.total
  }, [hand, players, showDealerHoleCard])

  if (!total) return null

  return (
    <p className={`hand-total ${total > 21 ? 'bust' : ''} ${total === 21 ? 'twenty-one' : ''}`}>
      <span className="sr-only">Total:</span>
      {total}
    </p>
  )
}

export default HandTotal
