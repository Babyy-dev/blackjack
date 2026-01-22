import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TableChat from '../components/TableChat'
import { useGameStore } from '../game/store'
import { useAuthStore } from '../store/authStore'
import { useLobbyStore } from '../store/lobbyStore'

const TablePage = () => {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const {
    currentTable,
    currentTableId,
    isConnected,
    joinTable,
    leaveTable,
    setReady,
    socket,
  } = useLobbyStore()
  const bindSocket = useGameStore((state) => state.bindSocket)
  const gameStatus = useGameStore((state) => state.status)
  const autoReadyRef = useRef<string | null>(null)
  const startKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (tableId && isConnected) joinTable(tableId)
  }, [tableId, isConnected, joinTable])

  useEffect(() => {
    bindSocket(socket ?? null, currentTableId ?? null)
  }, [bindSocket, socket, currentTableId])

  const players = currentTable?.players ?? []
  const myPlayer = useMemo(() => {
    if (!user?.id) return null
    return players.find((player) => player.userId === user.id) ?? null
  }, [players, user?.id])

  const readyCount = players.filter((player) => player.isReady).length
  const allReady = players.length > 0 && readyCount === players.length
  const canStartGame = Boolean(currentTableId && myPlayer && isConnected)
  const displayCode = currentTable?.inviteCode ?? tableId ?? '--'
  const codeLabel = currentTable?.isPrivate ? 'Invite code' : 'Table ID'
  const isRoundActive =
    gameStatus && !['waiting', 'round_end'].includes(gameStatus)
  const statusMessage = !currentTable
    ? 'Joining table and syncing seats...'
    : allReady
      ? 'All players are ready. Waiting for the dealer to start the round.'
      : 'Waiting for players to ready up before the round begins.'

  useEffect(() => {
    if (!currentTable || !isConnected || !myPlayer) return
    if (autoReadyRef.current === currentTable.id) return
    if (!myPlayer.isReady) {
      setReady(true)
    }
    autoReadyRef.current = currentTable.id
  }, [currentTable, isConnected, myPlayer, setReady])

  useEffect(() => {
    if (!currentTable || !isConnected) return
    if (!allReady) {
      startKeyRef.current = null
      return
    }
    const status = gameStatus ?? 'waiting'
    if (!['waiting', 'round_end'].includes(status)) return
    const startKey = `${currentTable.id}:${status}`
    if (startKeyRef.current === startKey) return
    startKeyRef.current = startKey
    if (socket?.connected) socket.emit('game:start')
  }, [allReady, currentTable, gameStatus, isConnected, socket])

  useEffect(() => {
    if (isRoundActive) navigate('/game')
  }, [isRoundActive, navigate])

  return (
    <div className="mx-auto flex w-full flex-col gap-8 px-6 py-10 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">Table</p>
          <h1 className="text-2xl font-display uppercase tracking-[0.2rem] text-white sm:text-3xl sm:tracking-[0.3rem]">
            {currentTable?.name ?? 'Loading table'}
          </h1>
          <p className="mt-2 break-all text-[0.6rem] uppercase tracking-[0.2rem] text-white/50 sm:text-xs sm:tracking-[0.25rem]">
            {codeLabel}: {displayCode} {currentTable?.isPrivate ? '(private)' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/lobby"
            className="rounded-full border border-white/20 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white transition hover:border-amber-300/70 hover:text-amber-200"
          >
            Back to lobby
          </Link>
          <button
            onClick={() => {
              if (socket?.connected) socket.emit('game:start')
              navigate('/game')
            }}
            disabled={!canStartGame}
            className="rounded-full border border-amber-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
          >
            Start game
          </button>
          <button
            onClick={() => {
              leaveTable()
              navigate('/lobby')
            }}
            className="rounded-full border border-red-400/50 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-red-200 transition hover:border-red-300 hover:text-red-100"
          >
            Leave table
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Players
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-white/60">
                {readyCount}/{players.length} ready
              </p>
            </div>
            <button
              onClick={() => setReady(!myPlayer?.isReady)}
              className="rounded-full bg-amber-300 px-6 py-2 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5 hover:bg-amber-200"
              disabled={!isConnected || !tableId || !myPlayer}
            >
              {myPlayer?.isReady ? 'Unready' : 'Ready'}
            </button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {players.map((player) => (
              <div
                key={player.userId}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white/70"
              >
                <span>{player.displayName}</span>
                <span
                  className={`text-xs uppercase tracking-[0.2rem] ${
                    player.isReady ? 'text-emerald-300' : 'text-white/40'
                  }`}
                >
                  {player.isReady ? 'Ready' : 'Waiting'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              Table rules
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2rem] text-white/50">
                  Min bet
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {currentTable?.minBet ?? '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2rem] text-white/50">
                  Max bet
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {currentTable?.maxBet ?? '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2rem] text-white/50">
                  Decks
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {currentTable?.decks ?? '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2rem] text-white/50">
                  Starting bank
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {currentTable?.startingBank ?? '--'}
                </p>
              </div>
            </div>
          </section>

          <TableChat />
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#08161c] p-5 text-sm text-white/70 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2rem] text-white/50">Game status</p>
        <p className="mt-3">{statusMessage}</p>
      </section>
    </div>
  )
}

export default TablePage
