import type { Hand } from '../types'

const HandBet = ({ hand }: { hand: Hand }) => {
  const isLoss = hand.result ? ['lose', 'bust'].includes(hand.result) : false
  const isWin = hand.result ? ['push', 'win', 'blackjack'].includes(hand.result) : false

  return (
    <div className={`hand-bet ${isWin ? 'is-win' : ''} ${isLoss ? 'is-loss' : ''}`}>
      {Array.from({ length: hand.bet }, (_, i) => (
        <svg className="chip" key={`${hand.id}-${i}`}>
          <use href="#chip" />
        </svg>
      ))}
    </div>
  )
}

export default HandBet
