import { useMemo } from 'react'
import { useGameStore } from '../store'
import PlayerBank from './PlayerBank'

const PlayerToolbar = () => {
  const isDealing = useGameStore((state) => state.isDealing)
  const activePlayer = useGameStore((state) => state.activePlayer)
  const activeHand = useGameStore((state) => state.activeHand)
  const doubleDown = useGameStore((state) => state.doubleDown)
  const split = useGameStore((state) => state.split)
  const endHand = useGameStore((state) => state.endHand)
  const hit = useGameStore((state) => state.hit)

  const canDoubleDown = useMemo(() => {
    if (isDealing) return false
    if (!activePlayer || !activeHand) return false
    if (activePlayer.bank < activeHand.bet) return false
    return activeHand.cards.length === 2 && activePlayer.hands.length === 1
  }, [activeHand, activePlayer, isDealing])

  const canSplit = useMemo(() => {
    if (isDealing) return false
    if (!activePlayer || !activeHand) return false
    if (activePlayer.bank < activeHand.bet) return false
    return (
      activeHand.cards.length === 2 &&
      activePlayer.hands.length === 1 &&
      activeHand.cards[0].rank === activeHand.cards[1].rank
    )
  }, [activeHand, activePlayer, isDealing])

  return (
    <div className="player-toolbar" role="toolbar">
      <button disabled={!canDoubleDown} onClick={() => void doubleDown()}>
        Double<br />Down
      </button>
      <button disabled={!canSplit} onClick={() => void split()}>
        Split
      </button>
      <PlayerBank />
      <button disabled={isDealing} onClick={() => void endHand()}>
        Stand
      </button>
      <button disabled={isDealing} onClick={() => void hit()}>
        Hit
      </button>
    </div>
  )
}

export default PlayerToolbar
