import { useState } from 'react'
import { useGameStore } from '../store'

const TitleScreen = () => {
  const playRound = useGameStore((state) => state.playRound)
  const resetBank = useGameStore((state) => state.resetBank)
  const isGameOver = useGameStore((state) => state.isGameOver)
  const soundLoadProgress = useGameStore((state) => state.soundLoadProgress)
  const serverMode = useGameStore((state) => state.serverMode)
  const status = useGameStore((state) => state.status)

  const [showTitleScreen, setShowTitleScreen] = useState(true)

  const startGame = () => {
    setShowTitleScreen(false)
    if (!serverMode) {
      resetBank()
      useGameStore.setState({ isGameOver: false })
    }
    window.setTimeout(() => {
      void playRound()
    }, 500)
  }

  const isRoundActive =
    serverMode && status ? !['waiting', 'round_end'].includes(status) : false
  const visible = serverMode ? !isRoundActive : showTitleScreen || isGameOver

  return (
    <section className={`title-screen ${visible ? '' : 'is-hidden'}`}>
      <svg>
        <use href="#flourish" />
      </svg>
      <div>
        <h1>MACAJACK</h1>
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
