import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../api/client'
import { withAuthRetry } from '../api/authorized'
import { fetchProfile, updateProfile, uploadAvatar } from '../api/profile'
import { useAuthStore } from '../store/authStore'

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => withAuthRetry(fetchProfile),
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
      setMessage('Profile updated.')
      navigate('/lobby')
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => withAuthRetry((token) => uploadAvatar(token, file)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setMessage('Avatar updated.')
    },
  })

  if (!user) {
    return (
      <div className="mx-auto flex w-full  flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="text-4xl font-display uppercase tracking-[0.3rem] text-white">
          Member vault
        </h1>
        <p className="text-sm text-white/60">Log in to view and edit your casino profile.</p>
      </div>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full  flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="text-4xl font-display uppercase tracking-[0.3rem] text-white">
          Loading profile
        </h1>
        <p className="text-sm text-white/60">Fetching your vault details...</p>
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <div className="mx-auto flex w-full  flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="text-4xl font-display uppercase tracking-[0.3rem] text-white">
          Vault unavailable
        </h1>
        <p className="text-sm text-white/60">We could not load your profile right now.</p>
      </div>
    )
  }

  const rawAvatarUrl = profileQuery.data?.avatar_url ?? null
  const avatarUrl = rawAvatarUrl
    ? rawAvatarUrl.startsWith('data:') || rawAvatarUrl.startsWith('http')
      ? rawAvatarUrl
      : `${apiBaseUrl}${rawAvatarUrl}`
    : null

  return (
    <div className="mx-auto flex w-full  flex-col gap-10 px-6 py-16">
      <header>
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/80">Vault</p>
        <h1 className="mt-4 text-4xl font-display uppercase tracking-[0.3rem] text-white">
          {user.email}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Update your profile to stand out at the table.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-32 w-32 overflow-hidden rounded-full border border-white/20 bg-[#071219]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3rem] text-white/40">
                  No avatar
                </div>
              )}
            </div>
            <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2rem] text-white/70 transition hover:border-white/40">
              Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) avatarMutation.mutate(file)
                }}
              />
            </label>
            {avatarMutation.isError && (
              <p className="text-xs text-red-200">Avatar upload failed.</p>
            )}
          </div>
        </div>

        <form
          className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage(null)
            updateMutation.mutate({ display_name: displayName, bio })
          }}
        >
          {message && (
            <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
              {message}
            </div>
          )}
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2rem] text-white/60">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              minLength={3}
              maxLength={64}
              className="rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="mt-5 flex flex-col gap-2 text-xs uppercase tracking-[0.2rem] text-white/60">
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={280}
              rows={4}
              className="rounded-2xl border border-white/10 bg-[#071219] px-4 py-3 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="mt-6 rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfilePage
