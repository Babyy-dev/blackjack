import { request } from './client'
import { withAuthRetry } from './authorized'
import { useAuthStore } from '../store/authStore'
import type { WalletSummary, WalletTransaction } from './wallet'

const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  import.meta.env.VITE_DEMO_MODE === '1' ||
  import.meta.env.DEV

const isDemoAccessToken = (token: string | null) =>
  typeof token === 'string' && token.startsWith('demo-access:')

const DEMO_USERS_KEY = 'vlackjack.demo.adminUsers'

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

export type AdminOverview = {
  user_count: number
  active_sessions: number
  wallet_count: number
  recent_transactions: number
  generated_at: string
}

export type AdminUser = {
  id: string
  email: string
  display_name: string
  is_active: boolean
  is_admin: boolean
  role: string
  created_at: string
  wallet_balance: number
}

export type AdminUserUpdatePayload = {
  is_active?: boolean
  is_admin?: boolean
}

export type AdminWalletAdjustmentPayload = {
  action: 'credit' | 'debit' | 'set'
  amount: number
  reason?: string | null
}

export type AdminWalletAdjustmentResponse = {
  wallet: WalletSummary
  transaction: WalletTransaction
}

const buildDemoUsers = (): AdminUser[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-admin',
      email: 'admin@vlackjack.test',
      display_name: 'House Admin',
      is_active: true,
      is_admin: true,
      role: 'admin',
      created_at: now,
      wallet_balance: 50000,
    },
    {
      id: 'demo-player',
      email: 'player@vlackjack.test',
      display_name: 'Lucky Player',
      is_active: true,
      is_admin: false,
      role: 'player',
      created_at: now,
      wallet_balance: 25000,
    },
    {
      id: 'demo-guest',
      email: 'guest@vlackjack.test',
      display_name: 'Guest Seat',
      is_active: true,
      is_admin: false,
      role: 'player',
      created_at: now,
      wallet_balance: 1200,
    },
  ]
}

const buildDemoOverview = (users: AdminUser[]): AdminOverview => ({
  user_count: users.length,
  active_sessions: Math.max(1, Math.floor(users.length / 2)),
  wallet_count: users.length,
  recent_transactions: 12,
  generated_at: new Date().toISOString(),
})

const getDemoUsers = () => {
  if (!DEMO_MODE) return buildDemoUsers()
  const stored = readJson<AdminUser[]>(DEMO_USERS_KEY)
  if (stored) return stored
  const users = buildDemoUsers()
  writeJson(DEMO_USERS_KEY, users)
  return users
}

const saveDemoUsers = (users: AdminUser[]) => {
  writeJson(DEMO_USERS_KEY, users)
  return users
}

export const getAdminOverview = async () => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoOverview(getDemoUsers())
  }
  return withAuthRetry((accessToken) =>
    request<AdminOverview>('/api/admin/overview', {
      accessToken,
    }),
  )
}

export const getAdminUsers = async () => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return getDemoUsers()
  }
  return withAuthRetry((accessToken) =>
    request<AdminUser[]>('/api/admin/users', {
      accessToken,
    }),
  )
}

export const updateAdminUser = async (userId: string, payload: AdminUserUpdatePayload) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    const users = getDemoUsers()
    const updated = users.map((user) => {
      if (user.id !== userId) return user
      const nextIsAdmin =
        payload.is_admin === undefined ? user.is_admin : payload.is_admin
      return {
        ...user,
        ...payload,
        is_admin: nextIsAdmin,
        role: nextIsAdmin ? 'admin' : 'player',
      }
    })
    const next = saveDemoUsers(updated)
    const found = next.find((user) => user.id === userId)
    if (!found) throw new Error('Demo user not found.')
    return found
  }
  return withAuthRetry((accessToken) =>
    request<AdminUser>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}

export const revokeAdminSessions = async (userId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return { revoked: 1 }
  }
  return withAuthRetry((accessToken) =>
    request<{ revoked: number }>(`/api/admin/users/${userId}/sessions/revoke`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const adjustAdminWallet = async (
  userId: string,
  payload: AdminWalletAdjustmentPayload,
) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    const users = getDemoUsers()
    const now = new Date().toISOString()
    const target = users.find((user) => user.id === userId)
    if (!target) throw new Error('Demo user not found.')
    let nextBalance = target.wallet_balance
    if (payload.action === 'credit') {
      nextBalance += payload.amount
    } else if (payload.action === 'debit') {
      nextBalance = Math.max(0, nextBalance - payload.amount)
    } else {
      nextBalance = payload.amount
    }
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, wallet_balance: nextBalance } : user,
    )
    saveDemoUsers(updatedUsers)
    return {
      wallet: {
        balance: nextBalance,
        currency: 'TOKEN',
        eth_address: null,
        sol_address: null,
        updated_at: now,
      },
      transaction: {
        id: `demo-tx-${Math.random().toString(36).slice(2, 8)}`,
        amount:
          payload.action === 'set'
            ? nextBalance - target.wallet_balance
            : payload.action === 'debit'
              ? -payload.amount
              : payload.amount,
        kind: `admin_${payload.action}`,
        status: 'completed',
        created_at: now,
      },
    } satisfies AdminWalletAdjustmentResponse
  }
  return withAuthRetry((accessToken) =>
    request<AdminWalletAdjustmentResponse>(`/api/admin/users/${userId}/wallet/adjust`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}
