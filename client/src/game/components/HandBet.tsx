import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { Hand } from '../types'

const MAX_VISIBLE_CHIPS = 6

const HandBet = ({ hand }: { hand: Hand }) => {
  const isLoss = hand.result ? ['lose', 'bust'].includes(hand.result) : false
  const isWin = hand.result ? ['push', 'win', 'blackjack'].includes(hand.result) : false
  const chipCount = Math.max(hand.bet, 0)
  const visibleChips = Math.min(chipCount, MAX_VISIBLE_CHIPS)
  const betRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!betRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const chips = betRef.current.querySelectorAll('.chip')
    if (!chips.length) return
    gsap.fromTo(
      chips,
      { y: 10, opacity: 0, scale: 0.7 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.05, duration: 0.3, ease: 'back.out(1.6)' },
    )
  }, [visibleChips, hand.id])

  useEffect(() => {
    if (!betRef.current || !hand.result) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const chipStack = betRef.current.querySelector('.chip-stack')
    if (!chipStack) return
    if (isWin) {
      gsap.fromTo(
        chipStack,
        { y: 0 },
        { y: -8, duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.out' },
      )
    }
    if (isLoss) {
      gsap.to(chipStack, { opacity: 0.7, duration: 0.25 })
    }
  }, [hand.result, isWin, isLoss])

  return (
    <div
      ref={betRef}
      className={`hand-bet ${isWin ? 'is-win' : ''} ${isLoss ? 'is-loss' : ''}`}
    >
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
