import { request, requestForm } from './client'
import type { Profile, User } from './types'

const DEMO_PROFILE_KEY = 'vlackjack.demo.profile'
const DEMO_SESSION_KEY = 'vlackjack.demo_session'
const DEMO_MODE =
  !import.meta.env.PROD &&
  (import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_DEMO_MODE === '1')

const isDemoAccessToken = (token: string) => token.startsWith('demo-access:')

const readJson = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const readDemoUser = (): User | null => {
  const session = readJson<{ user?: User }>(DEMO_SESSION_KEY)
  return session?.user ?? null
}

const buildDefaultProfile = (): Profile => {
  const user = readDemoUser()
  const displayName =
    user?.profile?.display_name ??
    (user?.email ? user.email.split('@')[0] : 'Demo Player')
  return {
    display_name: displayName,
    bio: user?.profile?.bio ?? 'Offline demo profile.',
    avatar_url: user?.profile?.avatar_url ?? null,
  }
}

const getDemoProfile = (): Profile => {
  if (!DEMO_MODE) return buildDefaultProfile()
  const stored = readJson<Profile>(DEMO_PROFILE_KEY)
  if (stored) return stored
  const profile = buildDefaultProfile()
  writeJson(DEMO_PROFILE_KEY, profile)
  return profile
}

const saveDemoProfile = (profile: Profile): Profile => {
  writeJson(DEMO_PROFILE_KEY, profile)
  return profile
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

export type ProfileUpdatePayload = {
  display_name?: string
  bio?: string | null
}

export async function fetchProfile(accessToken: string): Promise<Profile> {
  if (DEMO_MODE && isDemoAccessToken(accessToken)) {
    return getDemoProfile()
  }
  return request<Profile>('/api/profile', {
    method: 'GET',
    accessToken,
  })
}

export async function updateProfile(
  accessToken: string,
  payload: ProfileUpdatePayload,
): Promise<Profile> {
  if (DEMO_MODE && isDemoAccessToken(accessToken)) {
    const current = getDemoProfile()
    const next: Profile = {
      display_name: payload.display_name ?? current.display_name,
      bio: payload.bio ?? current.bio,
      avatar_url: current.avatar_url ?? null,
    }
    return saveDemoProfile(next)
  }
  return request<Profile>('/api/profile', {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(payload),
  })
}

export async function uploadAvatar(accessToken: string, file: File): Promise<Profile> {
  if (DEMO_MODE && isDemoAccessToken(accessToken)) {
    const current = getDemoProfile()
    const avatar_url = await fileToDataUrl(file)
    return saveDemoProfile({ ...current, avatar_url })
  }
  const formData = new FormData()
  formData.append('file', file)
  return requestForm<Profile>('/api/profile/avatar', formData, {
    method: 'POST',
    accessToken,
  })
}
