import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const SiteLayout = () => {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="casino-shell relative min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 casino-grid" />
      <div className="pointer-events-none absolute -left-40 top-20 h-72 w-72 rounded-full casino-aurora opacity-60" />
      <div className="pointer-events-none absolute right-[-120px] top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,124,64,0.5),_transparent_65%)] blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(73,225,255,0.4),_transparent_65%)] blur-[120px]" />

      <header className="sticky top-0 z-50 h-24 w-full border-b border-white/5 bg-[#050f15]/80 backdrop-blur-xl transition-all">
        <div className="site-shell mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <NavLink
            to="/"
            className="flex items-center gap-4 group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all group-hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] group-hover:scale-105">
              <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="font-display text-3xl font-black">M</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-black uppercase tracking-[0.15em] text-white transition-colors group-hover:text-amber-300">
                Macajack
              </span>
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/40 group-hover:text-white/60 transition-colors">
                Premium Casino
              </span>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-10 md:flex">
            {[
              { path: '/lobby', label: 'Lobby' },
              { path: '/leaderboard', label: 'Rankings' },
              { path: '/wallet', label: 'Vault' },
              { path: '/profile', label: 'Profile' },
              ...(user?.is_admin ? [{ path: '/admin', label: 'Admin' }] : []),
            ].map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `relative text-xs font-bold uppercase tracking-[0.2em] transition-all hover:text-white ${isActive ? 'text-amber-400' : 'text-white/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && <span className="absolute -bottom-2 left-0 h-0.5 w-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />}
                  </>
                )}
              </NavLink>
            ))}

            <div className="ml-6 h-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {user ? (
              <div className="flex items-center gap-6">
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-bold text-white">{user.email}</div>
                  <div className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-400">
                    Balance: $10,420
                  </div>
                </div>
                <button
                  onClick={() => void logout()}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <NavLink
                to="/auth"
                className="group relative overflow-hidden rounded-full bg-white px-8 py-3 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-amber-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
              >
                <span className="relative z-10">Login</span>
              </NavLink>
            )}
          </nav>

          {/* Mobile Menu Button - Styled */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="group relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10"
            >
              <motion.span
                animate={isMobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="h-0.5 w-6 bg-amber-400"
              />
              <motion.span
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="h-0.5 w-6 bg-amber-400"
              />
              <motion.span
                animate={isMobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="h-0.5 w-6 bg-amber-400"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#050f15]/95 backdrop-blur-3xl md:hidden"
          >
            <nav className="flex flex-col items-center gap-8">
              {[
                { path: '/lobby', label: 'Lobby' },
                { path: '/leaderboard', label: 'Rankings' },
                { path: '/wallet', label: 'Vault' },
                { path: '/profile', label: 'Profile' },
                ...(user?.is_admin ? [{ path: '/admin', label: 'Admin' }] : []),
              ].map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `text-2xl font-black uppercase tracking-widest transition-all ${isActive ? 'text-amber-400' : 'text-white/40 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="h-px w-20 bg-white/10 my-4" />

              {user ? (
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="text-lg font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
                >
                  Sign Out
                </button>
              ) : (
                <NavLink
                  to="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full bg-white px-10 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  Login
                </NavLink>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="site-main relative z-10">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/10">
        <div className="site-shell flex flex-col gap-2 px-6 py-6 text-[0.6rem] uppercase tracking-[0.2rem] text-white/50 md:flex-row md:items-center md:justify-between md:text-xs">
          <span>MACAJACK Casino</span>
          <span>Play responsibly. 21+ only.</span>
        </div>
      </footer>
    </div>
  )
}

export default SiteLayout
