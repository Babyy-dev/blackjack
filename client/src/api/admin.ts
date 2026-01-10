import { request } from './client'
import { withAuthRetry } from './authorized'

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
  created_at: string
  wallet_balance: number
}

export const getAdminOverview = () =>
  withAuthRetry((accessToken) =>
    request<AdminOverview>('/api/admin/overview', {
      accessToken,
    }),
  )

export const getAdminUsers = () =>
  withAuthRetry((accessToken) =>
    request<AdminUser[]>('/api/admin/users', {
      accessToken,
    }),
  )
