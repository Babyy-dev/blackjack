import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

const DashboardNav = () => {
    const location = useLocation()
    const logout = useAuthStore((state) => state.logout)
    const user = useAuthStore((state) => state.user)

    const navItems = [
        { label: 'Lobby', path: '/lobby', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { label: 'Wallet', path: '/wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
        { label: 'Leaderboard', path: '/leaderboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { label: 'Friends', path: '/friends', icon: 'M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a4 4 0 10-8 0 4 4 0 008 0z' },
        { label: 'Profile', path: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ]

    return (
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#050f15]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

                {/* Logo */}
                <div className="flex items-center gap-4">
                    <Link to="/" className="group flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)] transition-transform group-hover:scale-110">
                            <span className="font-display text-xl font-bold">M</span>
                        </div>
                        <span className="font-display text-xl font-bold uppercase tracking-[0.15em] text-white">Macajack</span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden items-center gap-1 md:flex">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`relative rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${isActive ? 'text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute inset-0 rounded-full bg-amber-400"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                {/* User Actions */}
                <div className="flex items-center gap-4">
                    <div className="hidden text-right md:block">
                        <div className="text-xs font-bold text-white">{user?.profile?.display_name || user?.email}</div>
                        <div className="text-[10px] uppercase tracking-wider text-amber-400">VIP Member</div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        title="Sign Out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    )
}

export default DashboardNav
