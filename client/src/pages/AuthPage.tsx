import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/80">Member lounge</p>
        <h1 className="mt-4 text-5xl font-display uppercase tracking-[0.35rem] text-white">
          {mode === 'login' ? 'Return to the table' : 'Claim your seat'}
        </h1>
        <p className="mt-3 text-sm text-white/60">
          {mode === 'login'
            ? 'Log in to access your vault and resume your streak.'
            : 'Create a new account to track stats and unlock the high-limit lounge.'}
        </p>
      </header>

      <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2rem] transition ${
              mode === 'login'
                ? 'bg-amber-300 text-[#1b1200]'
                : 'border border-white/20 text-white/70 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2rem] transition ${
              mode === 'register'
                ? 'bg-amber-300 text-[#1b1200]'
                : 'border border-white/20 text-white/70 hover:text-white'
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
              className="rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-sm text-white placeholder:text-white/40"
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
              className="rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-sm text-white placeholder:text-white/40"
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
                  className="rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-sm text-white placeholder:text-white/40"
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
                  className="rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-sm text-white placeholder:text-white/40"
                  placeholder="Tell the house about your style."
                />
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Enter vault' : 'Create account'}
          </button>
        </form>
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-xs text-white/60">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/50">Demo credentials</p>
          <p className="mt-2">Admin: admin@vlackjack.test / DemoAdmin123!</p>
          <p>Player: player@vlackjack.test / DemoPlayer123!</p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
