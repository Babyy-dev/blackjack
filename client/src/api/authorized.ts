import { ApiError } from './client'
import { useAuthStore } from '../store/authStore'

export async function withAuthRetry<T>(
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const { accessToken, refresh } = useAuthStore.getState()
  if (!accessToken) throw new Error('Missing access token.')

  try {
    return await fn(accessToken)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await refresh()
      const updatedToken = useAuthStore.getState().accessToken
      if (!updatedToken) throw error
      return fn(updatedToken)
    }
    throw error
  }
}
