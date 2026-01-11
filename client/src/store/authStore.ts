import { create } from 'zustand'
import type { TokenPair, User } from '../api/types'
import { ApiError } from '../api/client'
import * as authApi from '../api/auth'

const ACCESS_TOKEN_KEY = 'vlackjack.access_token'
const REFRESH_TOKEN_KEY = 'vlackjack.refresh_token'
const DEMO_SESSION_KEY = 'vlackjack.demo_session'
const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  import.meta.env.VITE_DEMO_MODE === '1' ||
  import.meta.env.DEV

const readToken = (key: string) => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

const writeToken = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return
  if (value) window.localStorage.setItem(key, value)
  else window.localStorage.removeItem(key)
}

type DemoSession = {
  user: User
  tokens: TokenPair
}

const demoAdminCredentials = {
  email: 'admin@vlackjack.test',
  password: 'DemoAdmin123!',
}

const demoPlayerCredentials = {
  email: 'player@vlackjack.test',
  password: 'DemoPlayer123!',
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const createTokenPair = (seed: string): TokenPair => ({
  access_token: `demo-access:${seed}`,
  refresh_token: `demo-refresh:${seed}`,
  token_type: 'bearer',
  expires_in: 60 * 60,
})

const demoAdminUser: User = {
  id: 'demo-admin',
  email: demoAdminCredentials.email,
  is_active: true,
  is_admin: true,
  profile: {
    display_name: 'House Admin',
    bio: 'Casino operations dashboard access.',
    avatar_url: null,
  },
}

const demoPlayerUser: User = {
  id: 'demo-player',
  email: demoPlayerCredentials.email,
  is_active: true,
  is_admin: false,
  profile: {
    display_name: 'Lucky Player',
    bio: 'Here for the high-limit lounge.',
    avatar_url: null,
  },
}

const demoSessions: Record<'admin' | 'player', DemoSession> = {
  admin: { user: demoAdminUser, tokens: createTokenPair('admin') },
  player: { user: demoPlayerUser, tokens: createTokenPair('player') },
}

const readDemoSession = (): DemoSession | null => {
  if (!DEMO_MODE || typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(DEMO_SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DemoSession
    if (!parsed?.user?.id || !parsed?.tokens?.access_token) return null
    return parsed
  } catch {
    return null
  }
}

const writeDemoSession = (session: DemoSession | null) => {
  if (!DEMO_MODE || typeof window === 'undefined') return
  if (!session) {
    window.localStorage.removeItem(DEMO_SESSION_KEY)
    return
  }
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
}

const demoSessionForLogin = (payload: authApi.LoginPayload): DemoSession | null => {
  const email = normalizeEmail(payload.email)
  if (
    email === demoAdminCredentials.email &&
    payload.password === demoAdminCredentials.password
  ) {
    return demoSessions.admin
  }
  if (
    email === demoPlayerCredentials.email &&
    payload.password === demoPlayerCredentials.password
  ) {
    return demoSessions.player
  }
  return null
}

const demoSessionForRegister = (payload: authApi.RegisterPayload): DemoSession => {
  const email = normalizeEmail(payload.email)
  const id = `demo-${email.replace(/[^a-z0-9]/g, '') || 'player'}`
  return {
    user: {
      id,
      email,
      is_active: true,
      is_admin: false,
      profile: {
        display_name: payload.display_name.trim(),
        bio: payload.bio ?? null,
        avatar_url: null,
      },
    },
    tokens: createTokenPair(id),
  }
}

const isNetworkError = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof Error && error.message.toLowerCase().includes('fetch'))

type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isBootstrapped: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User | null) => void
  login: (payload: authApi.LoginPayload) => Promise<void>
  register: (payload: authApi.RegisterPayload) => Promise<void>
  refresh: () => Promise<void>
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isBootstrapped: false,
  setTokens: (accessToken: string, refreshToken: string) => {
    writeToken(ACCESS_TOKEN_KEY, accessToken)
    writeToken(REFRESH_TOKEN_KEY, refreshToken)
    set({ accessToken, refreshToken })
  },
  setUser: (user) => set({ user }),
  login: async (payload) => {
    set({ isLoading: true })
    try {
      const response = await authApi.login(payload)
      get().setTokens(response.tokens.access_token, response.tokens.refresh_token)
      set({ user: response.user })
      writeDemoSession(null)
    } catch (error) {
      if (DEMO_MODE && isNetworkError(error)) {
        const demoSession = demoSessionForLogin(payload)
        if (demoSession) {
          get().setTokens(
            demoSession.tokens.access_token,
            demoSession.tokens.refresh_token,
          )
          set({ user: demoSession.user })
          writeDemoSession(demoSession)
          return
        }
      }
      throw error
    } finally {
      set({ isLoading: false })
    }
  },
  register: async (payload) => {
    set({ isLoading: true })
    try {
      const response = await authApi.register(payload)
      get().setTokens(response.tokens.access_token, response.tokens.refresh_token)
      set({ user: response.user })
      writeDemoSession(null)
    } catch (error) {
      if (DEMO_MODE && isNetworkError(error)) {
        const demoSession = demoSessionForRegister(payload)
        get().setTokens(demoSession.tokens.access_token, demoSession.tokens.refresh_token)
        set({ user: demoSession.user })
        writeDemoSession(demoSession)
        return
      }
      throw error
    } finally {
      set({ isLoading: false })
    }
  },
  refresh: async () => {
    const demoSession = readDemoSession()
    if (demoSession) return
    const refreshToken = get().refreshToken
    if (!refreshToken) throw new Error('Missing refresh token.')

    const tokens = await authApi.refresh({ refresh_token: refreshToken })
    get().setTokens(tokens.access_token, tokens.refresh_token)
  },
  logout: async () => {
    const refreshToken = get().refreshToken
    const demoSession = readDemoSession()
    try {
      if (demoSession) {
        writeDemoSession(null)
      } else if (refreshToken) {
        await authApi.logout({ refresh_token: refreshToken })
      }
    } catch (error) {
      if (!demoSession && !isNetworkError(error)) throw error
    } finally {
      writeToken(ACCESS_TOKEN_KEY, null)
      writeToken(REFRESH_TOKEN_KEY, null)
      set({ user: null, accessToken: null, refreshToken: null })
    }
  },
  bootstrap: async () => {
    const accessToken = readToken(ACCESS_TOKEN_KEY)
    const refreshToken = readToken(REFRESH_TOKEN_KEY)
    const demoSession = readDemoSession()
    if (demoSession) {
      get().setTokens(demoSession.tokens.access_token, demoSession.tokens.refresh_token)
      set({ user: demoSession.user, isBootstrapped: true })
      return
    }
    if (!accessToken || !refreshToken) {
      set({ isBootstrapped: true })
      return
    }

    set({ accessToken, refreshToken })

    try {
      const user = await authApi.me(accessToken)
      set({ user })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          await get().refresh()
          const updatedToken = get().accessToken
          if (updatedToken) {
            const user = await authApi.me(updatedToken)
            set({ user })
          }
        } catch {
          writeToken(ACCESS_TOKEN_KEY, null)
          writeToken(REFRESH_TOKEN_KEY, null)
          set({ user: null, accessToken: null, refreshToken: null })
        }
      }
    } finally {
      set({ isBootstrapped: true })
    }
  },
}))
