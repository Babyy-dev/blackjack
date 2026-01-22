import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLobbyStore } from '../store/lobbyStore'

const LobbyPage = () => {
  const navigate = useNavigate()
  const {
    tables,
    currentTableId,
    isConnected,
    isConnecting,
    error,
    refreshLobby,
    createTable,
    joinTable,
    clearError,
  } = useLobbyStore()

  const [name, setName] = useState('')
  const [mode, setMode] = useState<'single' | 'multi'>('multi')
  const [maxPlayers, setMaxPlayers] = useState<number | ''>(6)
  const [isPrivate, setIsPrivate] = useState(false)
  const [minBet, setMinBet] = useState<number | ''>(10)
  const [maxBet, setMaxBet] = useState<number | ''>(500)
  const [decks, setDecks] = useState<number | ''>(6)
  const [startingBank, setStartingBank] = useState<number | ''>(2500)
  const [joinCode, setJoinCode] = useState('')
  const [pendingNavigation, setPendingNavigation] = useState(false)

  const isMultiplayer = mode === 'multi'

  const parseNumber = (value: number | '', fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    return fallback
  }

  const connectionLabel = useMemo(() => {
    if (isConnected) return 'Connected'
    if (isConnecting) return 'Connecting'
    return 'Offline'
  }, [isConnected, isConnecting])

  useEffect(() => {
    if (isConnected) refreshLobby()
  }, [isConnected, refreshLobby])

  useEffect(() => {
    if (pendingNavigation && currentTableId) {
      navigate(`/table/${currentTableId}`)
      setPendingNavigation(false)
    }
  }, [pendingNavigation, currentTableId, navigate])

  useEffect(() => {
    if (error) {
      const timer = window.setTimeout(() => clearError(), 4000)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [error, clearError])

  return (
    <div className="mx-auto flex w-full flex-col gap-10 px-6 py-12 sm:py-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">
            Multiplayer lobby
          </p>
          <h1 className="text-3xl font-display uppercase tracking-[0.25rem] text-white sm:text-4xl sm:tracking-[0.3rem]">
            Live tables
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.18rem] text-white/60 sm:text-xs sm:tracking-[0.2rem]">
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span>{connectionLabel}</span>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
            Create a table
          </h2>
          <div className="mt-6 space-y-4 text-sm text-white/70">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2rem] text-white/60">
                Table name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="High-limit lounge"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
              />
            </label>
            <div>
              <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Play mode</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`rounded-full border px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.25rem] transition ${
                    !isMultiplayer
                      ? 'border-amber-300/60 bg-amber-300 text-[#1b1200]'
                      : 'border-white/20 text-white/70 hover:border-amber-300/50 hover:text-amber-200'
                  }`}
                >
                  Single player
                </button>
                <button
                  type="button"
                  onClick={() => setMode('multi')}
                  className={`rounded-full border px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.25rem] transition ${
                    isMultiplayer
                      ? 'border-amber-300/60 bg-amber-300 text-[#1b1200]'
                      : 'border-white/20 text-white/70 hover:border-amber-300/50 hover:text-amber-200'
                  }`}
                >
                  Multiplayer
                </button>
              </div>
            </div>
            {isMultiplayer && (
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2rem] text-white/60">
                Max players (2-8)
              </span>
              <input
                type="number"
                min={2}
                max={8}
                value={maxPlayers}
                onChange={(event) => {
                  const raw = event.target.value
                  if (raw === '') {
                    setMaxPlayers('')
                    return
                  }
                  const value = Number(raw)
                  if (!Number.isNaN(value)) setMaxPlayers(value)
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
              />
            </label>
            )}
            {isMultiplayer && (
              <label className="flex items-center gap-3 text-xs uppercase tracking-[0.2rem] text-white/60">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                  className="h-4 w-4 rounded border-white/40 bg-transparent text-amber-300"
                />
                Private table (invite code)
              </label>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Table rules</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Min bet
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={minBet}
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        setMinBet('')
                        return
                      }
                      const value = Number(raw)
                      if (!Number.isNaN(value)) setMinBet(value)
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Max bet
                  </span>
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={maxBet}
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        setMaxBet('')
                        return
                      }
                      const value = Number(raw)
                      if (!Number.isNaN(value)) setMaxBet(value)
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Decks
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={decks}
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        setDecks('')
                        return
                      }
                      const value = Number(raw)
                      if (!Number.isNaN(value)) setDecks(value)
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Starting bank
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    value={startingBank}
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        setStartingBank('')
                        return
                      }
                      const value = Number(raw)
                      if (!Number.isNaN(value)) setStartingBank(value)
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>
              </div>
            </div>
            {isMultiplayer ? (
              <button
                onClick={() => {
                  const normalizedMax = Math.min(
                    Math.max(parseNumber(maxPlayers, 6), 2),
                    8,
                  )
                  const normalizedMinBet = Math.min(
                    Math.max(parseNumber(minBet, 10), 1),
                    1000,
                  )
                  const normalizedMaxBet = Math.min(
                    Math.max(parseNumber(maxBet, 500), normalizedMinBet),
                    10000,
                  )
                  const normalizedDecks = Math.min(Math.max(parseNumber(decks, 6), 1), 8)
                  let normalizedBank = Math.min(
                    Math.max(parseNumber(startingBank, 2500), 100),
                    100000,
                  )
                  if (normalizedBank < normalizedMinBet) {
                    normalizedBank = normalizedMinBet
                  }
                  setPendingNavigation(true)
                  createTable({
                    name: name.trim(),
                    maxPlayers: normalizedMax,
                    isPrivate,
                    minBet: normalizedMinBet,
                    maxBet: normalizedMaxBet,
                    decks: normalizedDecks,
                    startingBank: normalizedBank,
                  })
                }}
                className="w-full rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40 disabled:hover:translate-y-0"
                disabled={!isConnected}
              >
                Open table
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/game?mode=solo')}
                className="w-full rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5 hover:bg-amber-200"
              >
                Start single player
              </button>
            )}
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <h3 className="text-base font-display uppercase tracking-[0.2rem] text-white sm:text-lg">
              Join by code
            </h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="Enter table code"
                className="flex-1 rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
              />
              <button
                onClick={() => {
                  const trimmed = joinCode.trim()
                  if (trimmed) {
                    setPendingNavigation(true)
                    joinTable(trimmed)
                  }
                }}
                disabled={!isConnected}
                className="rounded-full border border-amber-300/60 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
              >
                Join
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              Available tables
            </h2>
            {currentTableId && (
              <Link
                to={`/table/${currentTableId}`}
                className="rounded-full border border-amber-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100"
              >
                Return to table
              </Link>
            )}
          </div>
          <div className="mt-6 space-y-4">
            {tables.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">
                No live tables yet. Create one to get started.
              </div>
            )}
            {tables.map((table) => (
              <div
                key={table.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/70"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{table.name}</p>
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/50">
                    {table.playerCount}/{table.maxPlayers} players
                    {table.isPrivate ? ' (private)' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    joinTable(table.id)
                    navigate(`/table/${table.id}`)
                  }}
                  disabled={!isConnected}
                  className="rounded-full border border-white/20 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                >
                  Join table
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default LobbyPage
