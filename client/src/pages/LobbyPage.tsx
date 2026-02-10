import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLobbyStore } from '../store/lobbyStore'
import DashboardNav from '../components/DashboardNav'
import AnimatedBackground from '../components/AnimatedBackground'

const LobbyPage = () => {
  const navigate = useNavigate()
  const {
    tables,
    isConnected,
    refreshLobby,
    createTable,
    joinTable,
    error,
    clearError
  } = useLobbyStore()

  // State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // Effects
  useEffect(() => {
    if (isConnected) refreshLobby()
  }, [isConnected, refreshLobby])

  useEffect(() => {
    if (error) setTimeout(clearError, 4000)
  }, [error, clearError])

  return (
    <div className="min-h-screen w-full bg-[#050f15] text-white">
      <AnimatedBackground />
      <DashboardNav />

      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Header Actions */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-white sm:text-5xl">
              Live Floor
            </h1>
            <p className="mt-2 text-sm text-white/60 font-medium tracking-wide">
              {tables.length} Active Tables • {isConnected ? 'Connected to Server' : 'Connecting...'}
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <div className="relative group">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="ENTER CODE..."
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 pl-10 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-amber-400/50 sm:w-48"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {joinCode.length > 0 && (
                <button
                  onClick={() => joinTable(joinCode)}
                  className="absolute right-2 top-2 rounded-lg bg-amber-400 px-2 py-1 text-[10px] font-bold uppercase text-black"
                >
                  Join
                </button>
              )}
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-amber-900/20 transition-transform hover:scale-[1.02]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Table
            </button>
          </div>
        </div>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 overflow-hidden rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tables Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {/* Quick Play (Single Player) Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/game?mode=solo')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-md transition-all hover:border-amber-400/50 hover:shadow-[0_0_30px_rgba(251,191,36,0.1)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white group-hover:bg-amber-400 group-hover:text-black transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold uppercase tracking-wider text-white">Solo Practice</h3>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-white/50 group-hover:text-white/80">
              Unlimited Chips • Private
            </p>
          </motion.div>

          {/* Live Tables */}
          {tables.map((table, i) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + (i * 0.05) }}
              onClick={() => joinTable(table.id)}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-[#08161c]/80 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(3, table.playerCount))].map((_, idx) => (
                    <div key={idx} className="h-8 w-8 rounded-full border-2 border-[#08161c] bg-white/20" />
                  ))}
                  {table.playerCount > 3 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#08161c] bg-white/10 text-[10px] font-bold">+{table.playerCount - 3}</div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${table.isPrivate ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                  {table.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold uppercase tracking-wider text-white truncate">{table.name}</h3>
              <div className="mt-4 flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-white/40">
                <span>{table.playerCount}/{table.maxPlayers} Players</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>${table.minBet} Min</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a1224] p-8 shadow-2xl"
            >
              <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Create Table</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Table Name</label>
                  <input
                    autoFocus
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white outline-none focus:border-amber-400/50"
                    placeholder="High Roller Suite"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      createTable({
                        name: newTableName || 'VIP Table',
                        maxPlayers: 5,
                        minBet: 100,
                        maxBet: 5000,
                        decks: 6,
                        startingBank: 50000,
                        isPrivate: false
                      })
                      setShowCreateModal(false)
                    }}
                    className="rounded-xl bg-amber-400 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-amber-300"
                  >
                    Create Public
                  </button>
                  <button
                    onClick={() => {
                      createTable({
                        name: newTableName || 'Private Room',
                        maxPlayers: 3,
                        minBet: 500,
                        maxBet: 10000,
                        decks: 2,
                        startingBank: 100000,
                        isPrivate: true
                      })
                      setShowCreateModal(false)
                    }}
                    className="rounded-xl border border-white/20 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/5"
                  >
                    Create Private
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LobbyPage
