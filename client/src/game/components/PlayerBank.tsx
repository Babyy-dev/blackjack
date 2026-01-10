import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'

const PlayerBank = () => {
  const bank = useGameStore((state) => state.players[0].bank)
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
