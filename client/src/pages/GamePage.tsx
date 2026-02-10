import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TableChat from '../components/TableChat'
import { useGameStore } from '../game/store'
import { initSound, loadSounds, playSound, Sounds } from '../game/sound'
import { useLobbyStore } from '../store/lobbyStore'
import { useAuthStore } from '../store/authStore'

const GamePage = () => {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const gameRef = useRef<any>(null)

  // Store & State
  const {
    socket,
    currentTableId,
    joinTable,
    leaveTable
  } = useLobbyStore()

  const {
    players,
    activePlayer,
    activeHand,
    isDealing,
    showDealerHoleCard,
    isActionPending,
    isMuted,
    toggleMuted,
    hit,
    split,
    doubleDown,
    endHand, // stand
    setSoundLoadProgress,
    bindSocket,
    serverError
  } = useGameStore()

  const userId = useAuthStore((state) => state.user?.id)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isNarrow, setIsNarrow] = useState(false)

  // Initialization
  useEffect(() => {
    if (tableId && socket?.connected) {
      joinTable(tableId)
    }
    // Audio init
    void initSound()
    void loadSounds((p) => setSoundLoadProgress(Math.min(100, Math.round(p))))

    return () => {
      leaveTable()
    }
  }, [tableId, socket, joinTable, leaveTable, setSoundLoadProgress])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 768px)')
    const handleChange = () => setIsNarrow(media.matches)
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (isNarrow) setIsChatOpen(false)
  }, [isNarrow])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleUnload = () => leaveTable()
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [leaveTable])

  useEffect(() => {
    bindSocket(socket ?? null, currentTableId ?? null)
    return () => bindSocket(null, null)
  }, [bindSocket, socket, currentTableId])

  // Computed Game State for Vue Prop Passing
  const orderedPlayers = useMemo(
    () => [...players].sort((a, b) => Number(b.isDealer) - Number(a.isDealer)),
    [players]
  )

  const isMyTurn = useMemo(() => {
    return !activePlayer?.userId || activePlayer.userId === userId
  }, [activePlayer, userId])

  const canDoubleDown = useMemo(() => {
    if (isDealing || !activePlayer || !activeHand) return false
    if (activePlayer.bank < activeHand.bet) return false
    return activeHand.cards.length === 2 && activePlayer.hands.length === 1
  }, [activeHand, activePlayer, isDealing])

  const canSplit = useMemo(() => {
    if (isDealing || !activePlayer || !activeHand) return false
    if (activePlayer.bank < activeHand.bet) return false
    return (
      activeHand.cards.length === 2 &&
      activePlayer.hands.length === 1 &&
      activeHand.cards[0].rank === activeHand.cards[1].rank
    )
  }, [activeHand, activePlayer, isDealing])

  const playerBank = useMemo(() => {
    const seat = players.find(p => p.userId === userId && !p.isDealer) ?? players.find(p => !p.isDealer)
    return seat?.bank ?? 0
  }, [players, userId])

  // Sync Props to Vue Custom Element
  useEffect(() => {
    const el = gameRef.current
    if (!el) return

    el.players = orderedPlayers
    el.activePlayerId = activePlayer?.userId ?? null
    el.activeHandId = activeHand?.id ?? null
    el.isDealing = isDealing
    el.showDealerHoleCard = showDealerHoleCard
    el.isMuted = isMuted
    el.canDoubleDown = canDoubleDown
    el.canSplit = canSplit
    el.isActionPending = isActionPending
    el.isMyTurn = isMyTurn
    el.playerBank = playerBank

    // Actions
    el.onHit = () => hit()
    el.onSplit = () => split()
    el.onDoubleDown = () => doubleDown()
    el.onStand = () => endHand()
    el.onToggleMuted = () => toggleMuted()
  }, [
    orderedPlayers, activePlayer, activeHand, isDealing, showDealerHoleCard,
    isMuted, canDoubleDown, canSplit, isActionPending, isMyTurn, playerBank,
    hit, split, doubleDown, endHand, toggleMuted
  ])

  // Click Sound Handler
  const handleUiClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      void playSound(Sounds.Click, { isMuted })
    }
  }

  const handleExit = () => {
    leaveTable()
    navigate('/lobby')
  }

  const chatWidth = isChatOpen ? (isNarrow ? '100%' : '320px') : '0px'

  if (!currentTableId) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="animate-pulse text-xl font-display uppercase tracking-widest text-amber-500">
          Entering Casino Floor...
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-[100svh] min-h-[100svh] w-full overflow-hidden bg-[#050f15] font-body" onClickCapture={handleUiClick}>

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-[#051014] to-black" />
      <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.03] mix-blend-overlay" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col">

        {/* HUD Header */}
        <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col">
            <h1 className="font-display text-xl font-bold uppercase tracking-widest text-amber-400 drop-shadow-md sm:text-2xl">
              Macajack
            </h1>
            <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">
              VIP Table • {currentTableId.slice(0, 4)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Simple Balance Display for HUD */}
            <div className="hidden rounded-full border border-white/10 bg-black/40 px-4 py-1 backdrop-blur-md sm:block">
              <span className="mr-2 text-xs uppercase text-white/50">Balance</span>
              <span className="font-mono text-emerald-400">${playerBank.toLocaleString()}</span>
            </div>

            <button
              onClick={handleExit}
              className="group rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.6rem] font-bold uppercase tracking-wider text-white transition hover:bg-white/10 active:scale-95 sm:px-4 sm:text-xs"
            >
              Exit
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`rounded-full p-2 transition ${isChatOpen ? 'bg-amber-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </header>

        {/* Vue Game Engine Container */}
        <main className="relative z-10 flex flex-1 items-center justify-center overflow-hidden">
          {/* 
              This custom element is where the Vue app mounts. 
              We wrap it in a div to control sizing/positioning easily.
           */}
          <div className="h-full w-full max-w-[1920px] scale-100 transition-transform duration-500">
            {/* @ts-ignore - Custom element */}
            <vlackjack-game ref={gameRef} />
          </div>

          {/* Server Error Toast */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-24 z-50 rounded-lg border border-red-500/50 bg-red-900/90 px-6 py-3 font-bold text-white shadow-2xl backdrop-blur-md"
              >
                {serverError}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Chat Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: chatWidth, opacity: isChatOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`relative z-30 border-l border-white/5 bg-[#081218]/95 backdrop-blur-xl ${isNarrow ? 'fixed inset-0 border-l-0 border-t border-white/10' : ''}`}
      >
        <div className={`h-full overflow-hidden ${isNarrow ? 'w-full' : 'w-[320px]'}`}>
          <TableChat variant="game" layout={isNarrow ? 'overlay' : 'dock'} />
        </div>
      </motion.aside>

    </div>
  )
}

export default GamePage
