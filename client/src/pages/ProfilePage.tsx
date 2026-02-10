import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiBaseUrl } from '../api/client'
import { withAuthRetry } from '../api/authorized'
import { fetchProfile, updateProfile, uploadAvatar } from '../api/profile'
import { getMyStats } from '../api/stats'
import { useAuthStore } from '../store/authStore'
import DashboardNav from '../components/DashboardNav'
import AnimatedBackground from '../components/AnimatedBackground'

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => withAuthRetry(fetchProfile),
    enabled: !!user,
  })

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => withAuthRetry(getMyStats),
    enabled: !!user,
  })

  useEffect(() => {
    if (profileQuery.data) {
      setDisplayName(profileQuery.data.display_name)
      setBio(profileQuery.data.bio ?? '')
    }
  }, [profileQuery.data])

  const updateMutation = useMutation({
    mutationFn: (payload: { display_name?: string; bio?: string }) =>
      withAuthRetry((token) => updateProfile(token, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setMessage('Profile updated successfully.')
      setTimeout(() => setMessage(null), 3000)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => withAuthRetry((token) => uploadAvatar(token, file)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const rawAvatarUrl = profileQuery.data?.avatar_url ?? null
  const avatarUrl = rawAvatarUrl
    ? rawAvatarUrl.startsWith('data:') || rawAvatarUrl.startsWith('http')
      ? rawAvatarUrl
      : `${apiBaseUrl}${rawAvatarUrl}`
    : null

  if (!user) return null

  return (
    <div className="min-h-screen w-full bg-[#050f15] text-white">
      <AnimatedBackground />
      <DashboardNav />

      <main className="mx-auto max-w-6xl px-6 py-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-12 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex flex-col gap-16 lg:flex-row">

            {/* Avatar Section - Massive */}
            <div className="flex flex-col items-center gap-8 border-b border-white/10 pb-12 lg:border-b-0 lg:border-r lg:pr-16 lg:pb-0">
              <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-white/10 bg-black shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 font-display text-6xl font-bold text-black opacity-80">
                    {user.email[0].toUpperCase()}
                  </div>
                )}
                {avatarMutation.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-white">{displayName || 'Anonymous Player'}</h2>
                <p className="text-sm font-bold uppercase tracking-widest text-white/40">{user.email}</p>
              </div>

              <label className="cursor-pointer rounded-full border border-white/20 bg-white/5 px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-white/10 hover:border-white/40 hover:scale-105">
                Upload New
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) avatarMutation.mutate(file)
                  }}
                />
              </label>
            </div>

            {/* Form & Stats Section */}
            <div className="flex-1">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-white">Your Vault</h1>
                  <p className="mt-2 text-base text-white/50">Manage your persona and view your legacy.</p>
                </div>
                <div className="hidden rounded-full bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-500 sm:block">
                  Level 1 VIP
                </div>
              </div>

              {message && (
                <div className="mb-6 rounded-2xl bg-green-500/10 px-6 py-4 text-sm font-bold text-green-400 border border-green-500/20">
                  {message}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-base font-bold text-white outline-none focus:border-amber-400/50 focus:bg-black/60 transition-all"
                    placeholder="Enter alias..."
                  />
                </div>
                <div className="group md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-base font-medium text-white outline-none focus:border-amber-400/50 focus:bg-black/60 transition-all"
                    placeholder="Tell your story..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => updateMutation.mutate({ display_name: displayName, bio })}
                  disabled={updateMutation.isPending}
                  className="rounded-full bg-amber-400 px-10 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all hover:scale-105 hover:bg-amber-300 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Syncing...' : 'Save Updates'}
                </button>
              </div>

              {/* Stats Section - Premium Grid */}
              <div className="mt-16 border-t border-white/10 pt-10">
                <h3 className="mb-8 font-display text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-4">
                  <span className="h-px flex-1 bg-white/10"></span>
                  Career Statistics
                  <span className="h-px flex-1 bg-white/10"></span>
                </h3>

                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {[
                    { label: 'Hands Dealt', value: statsQuery.data?.hands_played ?? 0, color: 'text-white' },
                    { label: 'Victories', value: statsQuery.data?.wins ?? 0, color: 'text-green-400' },
                    { label: 'Win Rate', value: `${statsQuery.data?.win_rate ?? 0}%`, color: 'text-amber-400' },
                    { label: 'Net Earnings', value: `$${statsQuery.data?.total_winnings?.toLocaleString() ?? 0}`, color: 'text-white' },
                  ].map((stat, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-6 text-center transition-all hover:bg-white/10">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-2">{stat.label}</div>
                      <div className={`font-display text-3xl font-bold ${stat.color} drop-shadow-sm`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default ProfilePage
