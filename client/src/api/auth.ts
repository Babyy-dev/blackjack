import { request } from './client'
import type { AuthResponse, TokenPair, User } from './types'

export type RegisterPayload = {
  email: string
  password: string
  display_name: string
  bio?: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type RefreshPayload = {
  refresh_token: string
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function refresh(payload: RefreshPayload): Promise<TokenPair> {
  return request<TokenPair>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logout(payload: RefreshPayload): Promise<{ status: string }> {
  return request<{ status: string }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function me(accessToken: string): Promise<User> {
  return request<User>('/api/auth/me', {
    method: 'GET',
    accessToken,
  })
}
