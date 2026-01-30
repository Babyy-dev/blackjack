import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const SiteLayout = () => {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="casino-shell relative min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 casino-grid" />
      <div className="pointer-events-none absolute -left-40 top-20 h-72 w-72 rounded-full casino-aurora opacity-60" />
      <div className="pointer-events-none absolute right-[-120px] top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,124,64,0.5),_transparent_65%)] blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(73,225,255,0.4),_transparent_65%)] blur-[120px]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#02131a]/80 backdrop-blur">
        <div className="site-shell flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink
            to="/"
            className="text-xl font-display uppercase tracking-[0.25rem] text-white sm:text-2xl sm:tracking-[0.3rem]"
          >
            MACAJACK
          </NavLink>
          <nav className="flex w-full flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.18rem] sm:w-auto sm:gap-4 sm:text-sm sm:tracking-[0.2rem]">
            <NavLink
              to="/lobby"
              className={({ isActive }) =>
                `transition ${isActive ? 'text-amber-300' : 'text-white/70 hover:text-white'}`
              }
            >
              Lobby
            </NavLink>
            <NavLink
              to="/wallet"
              className={({ isActive }) =>
                `transition ${isActive ? 'text-amber-300' : 'text-white/70 hover:text-white'}`
              }
            >
              Wallet
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `transition ${isActive ? 'text-amber-300' : 'text-white/70 hover:text-white'}`
              }
            >
              Profile
            </NavLink>
            {user?.is_admin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `transition ${isActive ? 'text-amber-300' : 'text-white/70 hover:text-white'}`
                }
              >
                Admin
              </NavLink>
            )}
            {user ? (
              <button
                onClick={() => void logout()}
                className="rounded-full border border-amber-300/40 px-4 py-2 text-[0.6rem] font-semibold text-amber-200 transition hover:border-amber-300 hover:text-amber-100 sm:text-xs"
              >
                Sign out
              </button>
            ) : (
              <NavLink
                to="/auth"
                className="rounded-full border border-amber-300/40 px-4 py-2 text-[0.6rem] font-semibold text-amber-200 transition hover:border-amber-300 hover:text-amber-100 sm:text-xs"
              >
                Member login
              </NavLink>
            )}
          </nav>
        </div>
      </header>

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
