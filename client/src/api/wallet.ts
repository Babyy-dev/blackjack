import { request } from './client'
import { withAuthRetry } from './authorized'
import { useAuthStore } from '../store/authStore'

const DEMO_WALLET_KEY = 'vlackjack.demo.wallet'
const DEMO_MODE =
  !import.meta.env.PROD &&
  (import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_DEMO_MODE === '1')

const isDemoAccessToken = (token: string | null) =>
  typeof token === 'string' && token.startsWith('demo-access:')

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

export type WalletSummary = {
  balance: number
  currency: string
  eth_address: string | null
  sol_address: string | null
  eth_deposit_address?: string | null
  sol_deposit_address?: string | null
  updated_at: string
}

export type WalletTransaction = {
  id: string
  amount: number
  kind: string
  status: string
  created_at: string
}

export type WalletResponse = {
  wallet: WalletSummary
  transactions: WalletTransaction[]
}

export type WalletWithdrawal = {
  id: string
  chain: string
  address: string
  amount_tokens: number
  status: string
  tx_hash?: string | null
  created_at: string
  updated_at?: string
}

export type WalletWithdrawalRequest = {
  chain: string
  amount_tokens: number
  address?: string | null
}

export type WalletTableDepositPayload = {
  amount_tokens: number
  table_id?: string | null
}

export type WalletTableDepositResponse = {
  wallet: WalletSummary
  transaction: WalletTransaction
  table_id: string
  table_bank: number
}

export type WalletLinkPayload = {
  eth_address?: string | null
  sol_address?: string | null
}

const buildDefaultWallet = (): WalletResponse => {
  const now = new Date().toISOString()
  return {
    wallet: {
      balance: 25000,
      currency: 'TOKEN',
      eth_address: null,
      sol_address: null,
      updated_at: now,
    },
    transactions: [
      {
        id: 'demo-tx-1',
        amount: 5000,
        kind: 'Deposit',
        status: 'completed',
        created_at: now,
      },
      {
        id: 'demo-tx-2',
        amount: -1200,
        kind: 'Wager',
        status: 'completed',
        created_at: now,
      },
      {
        id: 'demo-tx-3',
        amount: 2100,
        kind: 'Win',
        status: 'completed',
        created_at: now,
      },
    ],
  }
}

const getDemoWallet = (): WalletResponse => {
  if (!DEMO_MODE) return buildDefaultWallet()
  const stored = readJson<WalletResponse>(DEMO_WALLET_KEY)
  if (stored) return stored
  const wallet = buildDefaultWallet()
  writeJson(DEMO_WALLET_KEY, wallet)
  return wallet
}

const saveDemoWallet = (wallet: WalletResponse) => {
  writeJson(DEMO_WALLET_KEY, wallet)
  return wallet
}

export const getWallet = async () => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return getDemoWallet()
  }
  return withAuthRetry((accessToken) =>
    request<WalletResponse>('/api/wallet', {
      accessToken,
    }),
  )
}

export const linkWallet = async (payload: WalletLinkPayload) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    const current = getDemoWallet()
    const updated: WalletResponse = {
      ...current,
      wallet: {
        ...current.wallet,
        eth_address:
          payload.eth_address === undefined
            ? current.wallet.eth_address
            : payload.eth_address,
        sol_address:
          payload.sol_address === undefined
            ? current.wallet.sol_address
            : payload.sol_address,
        updated_at: new Date().toISOString(),
      },
    }
    saveDemoWallet(updated)
    return updated.wallet
  }
  return withAuthRetry((accessToken) =>
    request<WalletSummary>('/api/wallet/link', {
      method: 'PUT',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}

export const getWithdrawals = async () => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return [] as WalletWithdrawal[]
  }
  return withAuthRetry((accessToken) =>
    request<WalletWithdrawal[]>('/api/wallet/withdrawals', {
      accessToken,
    }),
  )
}

export const requestWithdrawal = async (payload: WalletWithdrawalRequest) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    return {
      id: `demo-withdraw-${Math.random().toString(36).slice(2, 8)}`,
      chain: payload.chain,
      address: payload.address ?? 'demo-address',
      amount_tokens: payload.amount_tokens,
      status: 'pending',
      created_at: new Date().toISOString(),
    } satisfies WalletWithdrawal
  }
  return withAuthRetry((accessToken) =>
    request<WalletWithdrawal>('/api/wallet/withdrawals', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}

export const depositToTable = async (payload: WalletTableDepositPayload) => {
  const token = useAuthStore.getState().accessToken
  if (DEMO_MODE && isDemoAccessToken(token)) {
    const current = getDemoWallet()
    if (payload.amount_tokens > current.wallet.balance) {
      throw new Error('Insufficient wallet balance')
    }
    const nextBalance = Math.max(0, current.wallet.balance - payload.amount_tokens)
    const updated: WalletResponse = {
      ...current,
      wallet: {
        ...current.wallet,
        balance: nextBalance,
        updated_at: new Date().toISOString(),
      },
      transactions: [
        {
          id: `demo-tx-${Math.random().toString(36).slice(2, 8)}`,
          amount: -payload.amount_tokens,
          kind: 'table_deposit',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
        ...current.transactions,
      ],
    }
    saveDemoWallet(updated)
    return {
      wallet: updated.wallet,
      transaction: updated.transactions[0],
      table_id: payload.table_id ?? 'demo-table',
      table_bank: payload.amount_tokens,
    } satisfies WalletTableDepositResponse
  }
  return withAuthRetry((accessToken) =>
    request<WalletTableDepositResponse>('/api/wallet/table/deposit', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
}
