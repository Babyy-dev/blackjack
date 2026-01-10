import { request, requestForm } from './client'
import type { Profile } from './types'

export type ProfileUpdatePayload = {
  display_name?: string
  bio?: string | null
}

export async function fetchProfile(accessToken: string): Promise<Profile> {
  return request<Profile>('/api/profile', {
    method: 'GET',
    accessToken,
  })
}

export async function updateProfile(
  accessToken: string,
  payload: ProfileUpdatePayload,
): Promise<Profile> {
  return request<Profile>('/api/profile', {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(payload),
  })
}

export async function uploadAvatar(accessToken: string, file: File): Promise<Profile> {
  const formData = new FormData()
  formData.append('file', file)
  return requestForm<Profile>('/api/profile/avatar', formData, {
    method: 'POST',
    accessToken,
  })
}
