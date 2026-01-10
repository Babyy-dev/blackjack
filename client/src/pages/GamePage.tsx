import { useEffect } from 'react'
import AnimatedBackground from '../game/components/AnimatedBackground'
import GameHand from '../game/components/GameHand'
import GameHeader from '../game/components/GameHeader'
import PlayerToolbar from '../game/components/PlayerToolbar'
import SvgSprite from '../game/components/SvgSprite'
import TitleScreen from '../game/components/TitleScreen'
import { useGameStore } from '../game/store'
import { initSound, loadSounds, playSound, Sounds } from '../game/sound'

const GamePage = () => {
  const players = useGameStore((state) => state.players)
  const isMuted = useGameStore((state) => state.isMuted)
  const setSoundLoadProgress = useGameStore((state) => state.setSoundLoadProgress)

  useEffect(() => {
    void initSound()
    void loadSounds((progress) => setSoundLoadProgress(Math.min(100, Math.round(progress))))
  }, [setSoundLoadProgress])

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const button = target.closest('button')
    if (button && !button.disabled) {
      void playSound(Sounds.Click, { isMuted })
    }
  }

  return (
    <div className="game">
      <SvgSprite />
      <AnimatedBackground />
      <GameHeader />
      <main className="game-main" onClickCapture={onClickCapture}>
        {players.map((player, index) => (
          <section
            className={`player-row ${player.isDealer ? 'dealer' : ''}`}
            key={`${player.isDealer ? 'dealer' : 'player'}-${index}`}
          >
            {player.hands.map((hand) => (
              <GameHand key={hand.id} hand={hand} player={player} />
            ))}
          </section>
        ))}
        <PlayerToolbar />
      </main>
      <TitleScreen />
    </div>
  )
}

export default GamePage
