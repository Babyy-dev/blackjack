import { request } from './client'
import { withAuthRetry } from './authorized'

export type FriendProfile = {
  user_id: string
  display_name: string
  avatar_url: string | null
  is_online: boolean
  nickname?: string | null
}

export type FriendRequestPublic = {
  id: string
  requester: FriendProfile
  addressee: FriendProfile
  status: string
  created_at: string
  responded_at: string | null
}

export type FriendRequestList = {
  incoming: FriendRequestPublic[]
  outgoing: FriendRequestPublic[]
}

export type FriendMessagePublic = {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  read_at: string | null
  created_at: string
}

export type FriendMessageList = {
  messages: FriendMessagePublic[]
}

export type PushPublicKey = {
  public_key: string
}

export const listFriends = () =>
  withAuthRetry((accessToken) =>
    request<FriendProfile[]>('/api/friends', { accessToken }),
  )

export const listRequests = () =>
  withAuthRetry((accessToken) =>
    request<FriendRequestList>('/api/friends/requests', { accessToken }),
  )

export const searchUsers = (query: string) =>
  withAuthRetry((accessToken) =>
    request<FriendProfile[]>(`/api/friends/search?query=${encodeURIComponent(query)}`, {
      accessToken,
    }),
  )

export const sendRequest = (userId: string) =>
  withAuthRetry((accessToken) =>
    request<FriendRequestPublic>('/api/friends/request', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId }),
    }),
  )

export const acceptRequest = (requestId: string) =>
  withAuthRetry((accessToken) =>
    request<FriendRequestPublic>(`/api/friends/requests/${requestId}/accept`, {
      method: 'POST',
      accessToken,
    }),
  )

export const declineRequest = (requestId: string) =>
  withAuthRetry((accessToken) =>
    request<FriendRequestPublic>(`/api/friends/requests/${requestId}/decline`, {
      method: 'POST',
      accessToken,
    }),
  )

export const cancelRequest = (requestId: string) =>
  withAuthRetry((accessToken) =>
    request<FriendRequestPublic>(`/api/friends/requests/${requestId}/cancel`, {
      method: 'POST',
      accessToken,
    }),
  )

export const removeFriend = (friendId: string) =>
  withAuthRetry((accessToken) =>
    request<{ status: string }>(`/api/friends/${friendId}`, {
      method: 'DELETE',
      accessToken,
    }),
  )

export const listBlocked = () =>
  withAuthRetry((accessToken) =>
    request<FriendProfile[]>('/api/friends/blocked', { accessToken }),
  )

export const blockUser = (userId: string) =>
  withAuthRetry((accessToken) =>
    request<{ status: string }>('/api/friends/block', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId }),
    }),
  )

export const unblockUser = (userId: string) =>
  withAuthRetry((accessToken) =>
    request<{ status: string }>(`/api/friends/block/${userId}`, {
      method: 'DELETE',
      accessToken,
    }),
  )

export const sendMessage = (userId: string, message: string) =>
  withAuthRetry((accessToken) =>
    request<FriendMessagePublic>('/api/friends/messages', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId, message }),
    }),
  )

export const getMessages = (userId: string, before?: string) =>
  withAuthRetry((accessToken) =>
    request<FriendMessageList>(
      `/api/friends/messages/${userId}${before ? `?before=${encodeURIComponent(before)}` : ''}`,
      { accessToken },
    ),
  )

export const markMessagesRead = (userId: string, upToId?: string) =>
  withAuthRetry((accessToken) =>
    request<{ updated: number; readAt: string }>('/api/friends/messages/read', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId, up_to_id: upToId ?? null }),
    }),
  )

export const updateNickname = (userId: string, nickname: string | null) =>
  withAuthRetry((accessToken) =>
    request<{ status: string; nickname: string | null }>('/api/friends/nickname', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ user_id: userId, nickname }),
    }),
  )

export const getPushPublicKey = () =>
  withAuthRetry((accessToken) =>
    request<PushPublicKey>('/api/friends/push/public-key', { accessToken }),
  )

export const subscribePush = (subscription: PushSubscription) =>
  withAuthRetry((accessToken) =>
    request<{ status: string }>('/api/friends/push/subscribe', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(subscription),
    }),
  )

export const unsubscribePush = (endpoint: string) =>
  withAuthRetry((accessToken) =>
    request<{ status: string }>('/api/friends/push/unsubscribe', {
      method: 'DELETE',
      accessToken,
      body: JSON.stringify({ endpoint }),
    }),
  )
