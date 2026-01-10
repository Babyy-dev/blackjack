import { request } from './client'
import { withAuthRetry } from './authorized'

export type WalletSummary = {
  balance: number
  currency: string
  eth_address: string | null
  sol_address: string | null
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

export type WalletLinkPayload = {
  eth_address?: string | null
  sol_address?: string | null
}

export const getWallet = () =>
  withAuthRetry((accessToken) =>
    request<WalletResponse>('/api/wallet', {
      accessToken,
    }),
  )

export const linkWallet = (payload: WalletLinkPayload) =>
  withAuthRetry((accessToken) =>
    request<WalletSummary>('/api/wallet/link', {
      method: 'PUT',
      accessToken,
      body: JSON.stringify(payload),
    }),
  )
