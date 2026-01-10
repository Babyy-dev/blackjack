import { useState } from 'react'
import { useGameStore } from '../store'

const TitleScreen = () => {
  const playRound = useGameStore((state) => state.playRound)
  const resetBank = useGameStore((state) => state.resetBank)
  const isGameOver = useGameStore((state) => state.isGameOver)
  const soundLoadProgress = useGameStore((state) => state.soundLoadProgress)

  const [showTitleScreen, setShowTitleScreen] = useState(true)

  const startGame = () => {
    setShowTitleScreen(false)
    resetBank()
    useGameStore.setState({ isGameOver: false })
    window.setTimeout(() => {
      void playRound()
    }, 500)
  }

  const visible = showTitleScreen || isGameOver

  return (
    <section className={`title-screen ${visible ? '' : 'is-hidden'}`}>
      <svg>
        <use href="#flourish" />
      </svg>
      <div>
        <h1>
          Vl<span>a</span>ck<span>j</span>ack
        </h1>
        <p>Blackjack Simulator</p>
      </div>
      {soundLoadProgress < 100 ? (
        <div className="progress-container">
          <progress value={soundLoadProgress} max={100}>
            {soundLoadProgress}%
          </progress>
        </div>
      ) : (
        <button onClick={startGame}>{isGameOver ? 'Play Again' : 'Start Game'}</button>
      )}
    </section>
  )
}

export default TitleScreen
