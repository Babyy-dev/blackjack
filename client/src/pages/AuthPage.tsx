import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import AnimatedBackground from '../components/AnimatedBackground'

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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-6">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg md:max-w-xl"
      >
        {/* Header / Logo Area */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-5xl font-bold uppercase tracking-widest text-white drop-shadow-lg sm:text-6xl">
            Macajack
          </h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.35rem] text-amber-400">
            {mode === 'login' ? 'Welcome Back' : 'Join the Club'}
          </p>
        </div>

        {/* Glass Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <div className="p-10 sm:p-12">

            {/* Tabs */}
            <div className="mb-10 flex rounded-full bg-white/5 p-1">
              <button
                onClick={() => setMode('login')}
                className={`relative flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-all ${mode === 'login' ? 'text-black' : 'text-white/60 hover:text-white'
                  }`}
              >
                {mode === 'login' && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-full bg-amber-400"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">Sign In</span>
              </button>

              <button
                onClick={() => setMode('register')}
                className={`relative flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-all ${mode === 'register' ? 'text-black' : 'text-white/60 hover:text-white'
                  }`}
              >
                {mode === 'register' && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-full bg-amber-400"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">Register</span>
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 overflow-hidden rounded-lg bg-red-500/10 px-4 py-2 text-center text-xs font-medium text-red-200"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-4">
                <div className="group relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    required
                    className="peer w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-transparent focus:border-amber-400/50 focus:bg-white/10"
                  />
                  <label className="pointer-events-none absolute left-5 top-4 text-xs font-bold uppercase tracking-wider text-white/40 transition-all peer-focus:-top-6 peer-focus:left-1 peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:-top-6 peer-[:not(:placeholder-shown)]:left-1 peer-[:not(:placeholder-shown)]:text-amber-400">
                    Email Address
                  </label>
                </div>

                <div className="group relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    required
                    minLength={8}
                    className="peer w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-transparent focus:border-amber-400/50 focus:bg-white/10"
                  />
                  <label className="pointer-events-none absolute left-4 top-3 text-xs font-bold uppercase tracking-wider text-white/40 transition-all peer-focus:-top-6 peer-focus:left-1 peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:-top-6 peer-[:not(:placeholder-shown)]:left-1 peer-[:not(:placeholder-shown)]:text-amber-400">
                    Password
                  </label>
                </div>

                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="group relative pt-1">
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder=" "
                          required={mode === 'register'}
                          className="peer w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-transparent focus:border-amber-400/50 focus:bg-white/10"
                        />
                        <label className="pointer-events-none absolute left-5 top-5 text-xs font-bold uppercase tracking-wider text-white/40 transition-all peer-focus:-top-2 peer-focus:left-1 peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-1 peer-[:not(:placeholder-shown)]:text-amber-400">
                          Display Name
                        </label>
                      </div>

                      <div className="group relative pt-1">
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder=" "
                          rows={2}
                          className="peer w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-transparent focus:border-amber-400/50 focus:bg-white/10"
                        />
                        <label className="pointer-events-none absolute left-5 top-5 text-xs font-bold uppercase tracking-wider text-white/40 transition-all peer-focus:-top-2 peer-focus:left-1 peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-1 peer-[:not(:placeholder-shown)]:text-amber-400">
                          Bio (Optional)
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-4 text-xs font-black uppercase tracking-[0.2rem] text-black shadow-lg shadow-amber-900/20 transition-all hover:scale-[1.02] hover:shadow-amber-900/40 disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Enter Vault' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AuthPage
