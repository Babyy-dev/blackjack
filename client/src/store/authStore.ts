import { create } from 'zustand'
import type { User } from '../api/types'
import { ApiError } from '../api/client'
import * as authApi from '../api/auth'

const ACCESS_TOKEN_KEY = 'vlackjack.access_token'
const REFRESH_TOKEN_KEY = 'vlackjack.refresh_token'

const readToken = (key: string) => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

const writeToken = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return
  if (value) window.localStorage.setItem(key, value)
  else window.localStorage.removeItem(key)
}

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
    } finally {
      set({ isLoading: false })
    }
  },
  refresh: async () => {
    const refreshToken = get().refreshToken
    if (!refreshToken) throw new Error('Missing refresh token.')

    const tokens = await authApi.refresh({ refresh_token: refreshToken })
    get().setTokens(tokens.access_token, tokens.refresh_token)
  },
  logout: async () => {
    const refreshToken = get().refreshToken
    try {
      if (refreshToken) await authApi.logout({ refresh_token: refreshToken })
    } finally {
      writeToken(ACCESS_TOKEN_KEY, null)
      writeToken(REFRESH_TOKEN_KEY, null)
      set({ user: null, accessToken: null, refreshToken: null })
    }
  },
  bootstrap: async () => {
    const accessToken = readToken(ACCESS_TOKEN_KEY)
    const refreshToken = readToken(REFRESH_TOKEN_KEY)
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
