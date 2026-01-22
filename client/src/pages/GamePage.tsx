import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import TableChat from '../components/TableChat'
import AnimatedBackground from '../game/components/AnimatedBackground'
import GameHand from '../game/components/GameHand'
import GameHeader from '../game/components/GameHeader'
import PlayerToolbar from '../game/components/PlayerToolbar'
import SvgSprite from '../game/components/SvgSprite'
import TitleScreen from '../game/components/TitleScreen'
import { useGameStore } from '../game/store'
import { initSound, loadSounds, playSound, Sounds } from '../game/sound'
import { useLobbyStore } from '../store/lobbyStore'

const GamePage = () => {
  const currentTableId = useLobbyStore((state) => state.currentTableId)
  const socket = useLobbyStore((state) => state.socket)
  const players = useGameStore((state) => state.players)
  const isMuted = useGameStore((state) => state.isMuted)
  const setSoundLoadProgress = useGameStore((state) => state.setSoundLoadProgress)
  const bindSocket = useGameStore((state) => state.bindSocket)
  const serverError = useGameStore((state) => state.serverError)
  const location = useLocation()
  const isSolo = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('mode') === 'solo'
  }, [location.search])

  useEffect(() => {
    if (!currentTableId && !isSolo) return
    void initSound()
    void loadSounds((progress) => setSoundLoadProgress(Math.min(100, Math.round(progress))))
  }, [currentTableId, isSolo, setSoundLoadProgress])

  useEffect(() => {
    if (isSolo) {
      bindSocket(null, null)
      return
    }
    bindSocket(socket ?? null, currentTableId ?? null)
  }, [bindSocket, socket, currentTableId, isSolo])

  if (!currentTableId && !isSolo) {
    return (
      <div className="min-h-screen bg-[#02131a] text-white">
        <div className="mx-auto flex min-h-screen w-full  flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/80">
            Table required
          </p>
          <h1 className="text-3xl font-display uppercase tracking-[0.3rem] text-white">
            Create a table to start
          </h1>
          <p className="text-sm text-white/70">
            Join or create a table in the lobby before entering the blackjack room.
          </p>
          <Link
            to="/lobby"
            className="rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] shadow-glow transition hover:-translate-y-0.5 hover:bg-amber-200"
          >
            Go to lobby
          </Link>
        </div>
      </div>
    )
  }

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
      {serverError && (
        <div className="mx-auto mt-6 w-full max-w-4xl rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-center text-xs uppercase tracking-[0.2rem] text-red-100">
          {serverError}
        </div>
      )}
      <main className="game-main" onClickCapture={onClickCapture}>
        {players.map((player, index) => {
          const playerKey = player.userId ?? (player.isDealer ? 'dealer' : `player-${index}`)
          return (
          <section
            className={`player-row ${player.isDealer ? 'dealer' : ''}`}
            key={playerKey}
          >
            {player.hands.map((hand) => (
              <GameHand key={hand.id} hand={hand} player={player} />
            ))}
          </section>
          )
        })}
        <PlayerToolbar />
      </main>
      {!isSolo && <TableChat variant="game" />}
      <TitleScreen />
    </div>
  )
}

export default GamePage
