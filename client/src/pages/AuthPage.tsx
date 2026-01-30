import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

const AuthPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/lobby'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    try {
      if (mode === 'login') {
        await login({ email: normalizedEmail, password })
      } else {
        await register({
          email: normalizedEmail,
          password,
          display_name: displayName.trim(),
          bio,
        })
      }
      navigate(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-8 px-6 py-12 sm:gap-10 sm:py-16">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/80">Member lounge</p>
        <h1 className="mt-4 text-3xl font-display uppercase tracking-[0.25rem] text-white sm:text-5xl sm:tracking-[0.35rem]">
          {mode === 'login' ? 'Return to the table' : 'Claim your seat'}
        </h1>
        <p className="mt-3 text-sm text-white/60">
          {mode === 'login'
            ? 'Log in to access your vault and resume your streak.'
            : 'Create a new account to track stats and unlock the high-limit lounge.'}
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
        className="casino-panel mx-auto w-full max-w-xl rounded-3xl p-6 sm:p-8"
      >
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-full px-4 py-2 text-[0.6rem] uppercase tracking-[0.18rem] transition sm:text-xs sm:tracking-[0.2rem] ${
              mode === 'login'
                ? 'casino-button'
                : 'border border-white/30 text-white/70 hover:border-white/60 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-full px-4 py-2 text-[0.6rem] uppercase tracking-[0.18rem] transition sm:text-xs sm:tracking-[0.2rem] ${
              mode === 'register'
                ? 'casino-button'
                : 'border border-white/30 text-white/70 hover:border-white/60 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 text-sm">
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
              {error}
            </div>
          )}
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2rem] text-white/60">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-2xl border border-white/10 bg-[#0a1224] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60"
              placeholder="you@casino.com"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2rem] text-white/60">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="rounded-2xl border border-white/10 bg-[#0a1224] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60"
              placeholder="********"
            />
          </label>
          {mode === 'register' && (
            <>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2rem] text-white/60">
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  minLength={3}
                  maxLength={64}
                  className="rounded-2xl border border-white/10 bg-[#0a1224] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60"
                  placeholder="LuckyJack"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2rem] text-white/60">
                Bio
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={280}
                  rows={3}
                  className="rounded-2xl border border-white/10 bg-[#0a1224] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-amber-300/60"
                  placeholder="Tell the house about your style."
                />
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="casino-button mt-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] transition hover:-translate-y-0.5"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Enter vault' : 'Create account'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default AuthPage
