import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store'
import { useAuthStore } from '../../store/authStore'

const PlayerBank = () => {
  const players = useGameStore((state) => state.players)
  const userId = useAuthStore((state) => state.user?.id)
  const bank = useMemo(() => {
    if (!players.length) return 0
    const seat =
      players.find((player) => player.userId === userId && !player.isDealer) ??
      players.find((player) => !player.isDealer)
    return seat?.bank ?? 0
  }, [players, userId])
  const previous = useRef(bank)
  const [isIncreasing, setIsIncreasing] = useState(false)

  useEffect(() => {
    if (bank > previous.current) {
      setIsIncreasing(true)
      const timeout = window.setTimeout(() => setIsIncreasing(false), 1000)
      previous.current = bank
      return () => window.clearTimeout(timeout)
    }
    previous.current = bank
  }, [bank])

  return (
    <span role="status" className={`bank ${isIncreasing ? 'is-increasing' : ''}`}>
      <svg role="img" aria-label="Chips" className={`chip ${isIncreasing ? 'is-spinning' : ''}`}>
        <use href="#chip" />
      </svg>
      <span className="times">&times;</span>
      <span className="number">{bank}</span>
    </span>
  )
}

export default PlayerBank
