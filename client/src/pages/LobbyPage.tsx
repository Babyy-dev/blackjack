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
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [isPrivate, setIsPrivate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [pendingNavigation, setPendingNavigation] = useState(false)

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
    <div className="mx-auto flex w-full  flex-col gap-10 px-6 py-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">
            Multiplayer lobby
          </p>
          <h1 className="text-4xl font-display uppercase tracking-[0.3rem] text-white">
            Live tables
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2rem] text-white/60">
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
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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
                  const value = Number(event.target.value)
                  setMaxPlayers(Number.isNaN(value) ? 2 : value)
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60"
              />
            </label>
            <label className="flex items-center gap-3 text-xs uppercase tracking-[0.2rem] text-white/60">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-transparent text-amber-300"
              />
              Private table (invite code)
            </label>
            <button
              onClick={() => {
                const normalizedMax = Number.isFinite(maxPlayers)
                  ? Math.min(Math.max(maxPlayers, 2), 8)
                  : 6
                setPendingNavigation(true)
                createTable({
                  name: name.trim(),
                  maxPlayers: normalizedMax,
                  isPrivate,
                })
              }}
              className="w-full rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40 disabled:hover:translate-y-0"
              disabled={!isConnected}
            >
              Open table
            </button>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <h3 className="text-lg font-display uppercase tracking-[0.2rem] text-white">
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
                    joinTable(trimmed)
                    navigate(`/table/${trimmed}`)
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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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
