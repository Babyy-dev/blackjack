import type { Hand } from '../types'

const MAX_VISIBLE_CHIPS = 6

const HandBet = ({ hand }: { hand: Hand }) => {
  const isLoss = hand.result ? ['lose', 'bust'].includes(hand.result) : false
  const isWin = hand.result ? ['push', 'win', 'blackjack'].includes(hand.result) : false
  const chipCount = Math.max(hand.bet, 0)
  const visibleChips = Math.min(chipCount, MAX_VISIBLE_CHIPS)

  return (
    <div className={`hand-bet ${isWin ? 'is-win' : ''} ${isLoss ? 'is-loss' : ''}`}>
      <div className="chip-stack">
        {Array.from({ length: visibleChips }, (_, i) => (
          <svg className="chip" key={`${hand.id}-${i}`}>
            <use href="#chip" />
          </svg>
        ))}
      </div>
      {chipCount > MAX_VISIBLE_CHIPS && (
        <span className="chip-count">x{chipCount}</span>
      )}
    </div>
  )
}

export default HandBet
