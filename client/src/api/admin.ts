import { request } from './client'
import { withAuthRetry } from './authorized'
import { useAuthStore } from '../store/authStore'
import type { WalletSummary, WalletTransaction } from './wallet'

const DEMO_MODE =
  !import.meta.env.PROD &&
  (import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_DEMO_MODE === '1')

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
  is_banned: boolean
  banned_until: string | null
  muted_until: string | null
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

export type AdminActionLogEntry = {
  id: string
  admin_id: string
  action: string
  target_user_id: string | null
  target_table_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

export type AdminGameActionLogEntry = {
  id: string
  table_id: string
  round_id: string | null
  user_id: string | null
  action: string
  payload: Record<string, unknown>
  created_at: string
}

export type AdminTableSummary = {
  id: string
  name: string
  is_private: boolean
  max_players: number
  player_count: number
  invite_code?: string | null
  round_active: boolean
  is_paused: boolean
  betting_locked: boolean
  min_bet?: number | null
  max_bet?: number | null
  decks?: number | null
  starting_bank?: number | null
}

export type AdminTablePlayer = {
  user_id: string
  display_name: string
  is_ready: boolean
}

export type AdminTableDetail = {
  table: AdminTableSummary
  players: AdminTablePlayer[]
  game_state: Record<string, unknown> | null
}

export type AdminTableRulesPayload = {
  min_bet?: number
  max_bet?: number
  decks?: number
  starting_bank?: number
}

export type AdminForceResultPayload = {
  result: 'dealer_win' | 'player_win' | 'push' | 'dealer_blackjack' | 'dealer_bust'
}

export type AdminCryptoDeposit = {
  id: string
  user_id: string
  wallet_id: string
  chain: string
  address: string
  tx_hash: string
  amount_base: number
  amount_tokens: number
  status: string
  created_at: string
}

export type AdminCryptoWithdrawal = {
  id: string
  user_id: string
  wallet_id: string
  chain: string
  address: string
  amount_tokens: number
  amount_base: number | null
  status: string
  tx_hash: string | null
  created_at: string
  updated_at: string
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
      is_banned: false,
      banned_until: null,
      muted_until: null,
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
      is_banned: false,
      banned_until: null,
      muted_until: null,
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
      is_banned: false,
      banned_until: null,
      muted_until: null,
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

const demoTables: AdminTableSummary[] = [
  {
    id: 'demo-high-limit',
    name: 'High-limit lounge',
    is_private: false,
    max_players: 6,
    player_count: 3,
    invite_code: null,
    round_active: true,
    is_paused: false,
    betting_locked: false,
    min_bet: 50,
    max_bet: 2000,
    decks: 6,
    starting_bank: 5000,
  },
  {
    id: 'demo-midnight',
    name: 'Midnight room',
    is_private: false,
    max_players: 5,
    player_count: 2,
    invite_code: null,
    round_active: false,
    is_paused: false,
    betting_locked: false,
    min_bet: 10,
    max_bet: 500,
    decks: 4,
    starting_bank: 2500,
  },
]

const buildDemoTableDetail = (tableId: string): AdminTableDetail => {
  const table = demoTables.find((item) => item.id === tableId) ?? {
    id: tableId,
    name: 'Private table',
    is_private: true,
    max_players: 6,
    player_count: 1,
    invite_code: tableId.slice(0, 6).toUpperCase(),
    round_active: true,
    is_paused: false,
    betting_locked: false,
    min_bet: 25,
    max_bet: 1000,
    decks: 6,
    starting_bank: 3000,
  }
  const players: AdminTablePlayer[] = [
    {
      user_id: 'demo-admin',
      display_name: 'House Admin',
      is_ready: true,
    },
    {
      user_id: 'demo-player',
      display_name: 'Lucky Player',
      is_ready: true,
    },
  ].slice(0, Math.max(1, Math.min(table.player_count, 2)))
  return {
    table,
    players,
    game_state: {
      status: table.round_active ? 'player' : 'waiting',
      activePlayerId: players[0]?.user_id ?? null,
      turnEndsAt: new Date(Date.now() + 15000).toISOString(),
      minBet: table.min_bet ?? 10,
      maxBet: table.max_bet ?? 500,
    },
  }
}

const updateDemoTable = (tableId: string, updates: Partial<AdminTableSummary>) => {
  const table = demoTables.find((item) => item.id === tableId)
  if (table) Object.assign(table, updates)
  return buildDemoTableDetail(tableId)
}

const buildDemoWithdrawal = (
  withdrawalId: string,
  status: string,
  txHash?: string | null,
): AdminCryptoWithdrawal => ({
  id: withdrawalId,
  user_id: 'demo-player',
  wallet_id: 'demo-wallet',
  chain: 'ETH',
  address: 'demo-address',
  amount_tokens: 1000,
  amount_base: null,
  status,
  tx_hash: txHash ?? null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const buildDemoAdminLogs = (): AdminActionLogEntry[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-log-1',
      admin_id: 'demo-admin',
      action: 'wallet.adjust',
      target_user_id: 'demo-player',
      target_table_id: null,
      payload: { amount: 1000 },
      created_at: now,
    },
    {
      id: 'demo-log-2',
      admin_id: 'demo-admin',
      action: 'session.revoke',
      target_user_id: 'demo-player',
      target_table_id: null,
      payload: { revoked: 1 },
      created_at: now,
    },
  ]
}

const buildDemoGameLogs = (): AdminGameActionLogEntry[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-game-log-1',
      table_id: 'demo-high-limit',
      round_id: 'demo-round',
      user_id: 'demo-player',
      action: 'deal',
      payload: {},
      created_at: now,
    },
    {
      id: 'demo-game-log-2',
      table_id: 'demo-high-limit',
      round_id: 'demo-round',
      user_id: 'demo-player',
      action: 'hit',
      payload: {},
      created_at: now,
    },
  ]
}

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

const updateDemoUser = (
  userId: string,
  updater: (user: AdminUser) => Partial<AdminUser>,
) => {
  const users = getDemoUsers()
  let updatedUser: AdminUser | undefined
  const nextUsers = users.map((user) => {
    if (user.id !== userId) return user
    updatedUser = { ...user, ...updater(user) }
    return updatedUser
  })
  saveDemoUsers(nextUsers)
  if (!updatedUser) throw new Error('Demo user not found.')
  return updatedUser
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

export const getAdminLogs = async (limit = 50) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoAdminLogs()
  }
  const params = new URLSearchParams({ limit: String(limit) })
  return withAuthRetry((accessToken) =>
    request<AdminActionLogEntry[]>(`/api/admin/logs?${params.toString()}`, {
      accessToken,
    }),
  )
}

export const getAdminGameLogs = async ({
  tableId,
  limit = 50,
}: {
  tableId?: string
  limit?: number
}) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoGameLogs()
  }
  const params = new URLSearchParams({ limit: String(limit) })
  if (tableId) params.set('table_id', tableId)
  return withAuthRetry((accessToken) =>
    request<AdminGameActionLogEntry[]>(`/api/admin/game-logs?${params.toString()}`, {
      accessToken,
    }),
  )
}

export const getAdminTables = async () => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return demoTables
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableSummary[]>('/api/admin/tables', { accessToken }),
  )
}

export const getAdminTableDetail = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoTableDetail(tableId)
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}`, { accessToken }),
  )
}

export const kickAdminTablePlayer = async (tableId: string, userId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoTableDetail(tableId).table
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableSummary>(`/api/admin/tables/${tableId}/kick`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId }),
    }),
  )
}

export const forceAdminStand = async (tableId: string, userId?: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoTableDetail(tableId)
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/force-stand`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId ?? null }),
    }),
  )
}

export const endAdminRound = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoTableDetail(tableId)
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/end-round`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const pauseAdminTable = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, { is_paused: true })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/pause`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const resumeAdminTable = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, { is_paused: false })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/resume`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const restartAdminTable = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, { is_paused: false, round_active: false })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/restart`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const lockAdminBetting = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, { betting_locked: true })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/lock-betting`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const unlockAdminBetting = async (tableId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, { betting_locked: false })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/unlock-betting`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const updateAdminTableRules = async (
  tableId: string,
  payload: AdminTableRulesPayload,
) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, {
      min_bet: payload.min_bet ?? demoTables.find((item) => item.id === tableId)?.min_bet,
      max_bet: payload.max_bet ?? demoTables.find((item) => item.id === tableId)?.max_bet,
      decks: payload.decks ?? demoTables.find((item) => item.id === tableId)?.decks,
      starting_bank:
        payload.starting_bank ??
        demoTables.find((item) => item.id === tableId)?.starting_bank,
    })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/rules`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}

export const forceAdminResult = async (
  tableId: string,
  payload: AdminForceResultPayload,
) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoTable(tableId, { round_active: false })
  }
  return withAuthRetry((accessToken) =>
    request<AdminTableDetail>(`/api/admin/tables/${tableId}/force-result`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}

export const muteAdminUser = async (userId: string, minutes: number) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    const mutedUntil = new Date(Date.now() + minutes * 60_000).toISOString()
    return updateDemoUser(userId, () => ({ muted_until: mutedUntil }))
  }
  return withAuthRetry((accessToken) =>
    request<AdminUser>(`/api/admin/users/${userId}/mute`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ minutes }),
    }),
  )
}

export const unmuteAdminUser = async (userId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoUser(userId, () => ({ muted_until: null }))
  }
  return withAuthRetry((accessToken) =>
    request<AdminUser>(`/api/admin/users/${userId}/unmute`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const banAdminUser = async (userId: string, minutes?: number) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    const bannedUntil = minutes
      ? new Date(Date.now() + minutes * 60_000).toISOString()
      : null
    return updateDemoUser(userId, () => ({
      is_banned: true,
      is_active: false,
      banned_until: bannedUntil,
    }))
  }
  return withAuthRetry((accessToken) =>
    request<AdminUser>(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ minutes: minutes ?? null }),
    }),
  )
}

export const unbanAdminUser = async (userId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return updateDemoUser(userId, () => ({
      is_banned: false,
      is_active: true,
      banned_until: null,
    }))
  }
  return withAuthRetry((accessToken) =>
    request<AdminUser>(`/api/admin/users/${userId}/unban`, {
      method: 'POST',
      accessToken,
    }),
  )
}

export const getAdminCryptoDeposits = async (limit = 100) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return [] as AdminCryptoDeposit[]
  }
  const params = new URLSearchParams({ limit: String(limit) })
  return withAuthRetry((accessToken) =>
    request<AdminCryptoDeposit[]>(`/api/admin/crypto/deposits?${params.toString()}`, {
      accessToken,
    }),
  )
}

export const getAdminCryptoWithdrawals = async (limit = 100) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return [] as AdminCryptoWithdrawal[]
  }
  const params = new URLSearchParams({ limit: String(limit) })
  return withAuthRetry((accessToken) =>
    request<AdminCryptoWithdrawal[]>(
      `/api/admin/crypto/withdrawals?${params.toString()}`,
      {
        accessToken,
      },
    ),
  )
}

export const approveAdminWithdrawal = async (withdrawalId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoWithdrawal(withdrawalId, 'approved')
  }
  return withAuthRetry((accessToken) =>
    request<AdminCryptoWithdrawal>(
      `/api/admin/crypto/withdrawals/${withdrawalId}/approve`,
      { method: 'POST', accessToken },
    ),
  )
}

export const rejectAdminWithdrawal = async (withdrawalId: string) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoWithdrawal(withdrawalId, 'rejected')
  }
  return withAuthRetry((accessToken) =>
    request<AdminCryptoWithdrawal>(
      `/api/admin/crypto/withdrawals/${withdrawalId}/reject`,
      { method: 'POST', accessToken },
    ),
  )
}

export const markAdminWithdrawalPaid = async (
  withdrawalId: string,
  txHash?: string,
) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return buildDemoWithdrawal(withdrawalId, 'paid', txHash ?? null)
  }
  return withAuthRetry((accessToken) =>
    request<AdminCryptoWithdrawal>(
      `/api/admin/crypto/withdrawals/${withdrawalId}/mark-paid`,
      {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ tx_hash: txHash ?? null }),
      },
    ),
  )
}
