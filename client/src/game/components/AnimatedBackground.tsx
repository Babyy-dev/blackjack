import { useMemo, type CSSProperties } from 'react'
import { CardSuits } from '../cards'

const NUM_SHAPES = 60
const MIN_SIZE = 20
const MAX_SIZE = 80
const MIN_DURATION = 60
const MAX_DURATION = 120

const suits = CardSuits

const AnimatedBackground = () => {
  const shapes = useMemo(() => {
    const height = typeof window === 'undefined' ? 800 : window.innerHeight
    return Array.from({ length: NUM_SHAPES }, (_, i) => ({
      id: i,
      suit: suits[i % 4],
      style: {
        top: `${Math.random() * height}px`,
        width: `${Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE}px`,
        height: `${Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE}px`,
        animationDuration: `${Math.random() * (MAX_DURATION - MIN_DURATION) + MIN_DURATION}s`,
        animationDelay: `${-Math.random() * MAX_DURATION}s`,
      } as CSSProperties,
    }))
  }, [])

  return (
    <div className="animated-bg">
      {shapes.map((shape) => (
        <svg key={shape.id} style={shape.style}>
          <use href={`#suit-${shape.suit}`} />
        </svg>
      ))}
    </div>
  )
}

export default AnimatedBackground
