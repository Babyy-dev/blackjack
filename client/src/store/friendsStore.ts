import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import * as friendsApi from '../api/friends'
import { useAuthStore } from './authStore'

type FriendsState = {
  friends: friendsApi.FriendProfile[]
  incoming: friendsApi.FriendRequestPublic[]
  outgoing: friendsApi.FriendRequestPublic[]
  blocked: friendsApi.FriendProfile[]
  searchResults: friendsApi.FriendProfile[]
  messages: Record<string, friendsApi.FriendMessagePublic[]>
  typing: Record<string, boolean>
  activeFriendId: string | null
  isLoading: boolean
  error: string | null
  chatConnected: boolean
  bindSocket: (socket: Socket | null) => void
  refreshAll: () => Promise<void>
  search: (query: string) => Promise<void>
  sendRequest: (userId: string) => Promise<void>
  acceptRequest: (requestId: string) => Promise<void>
  declineRequest: (requestId: string) => Promise<void>
  cancelRequest: (requestId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  updateNickname: (friendId: string, nickname: string | null) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
  loadMessages: (friendId: string) => Promise<void>
  sendMessage: (friendId: string, message: string) => Promise<void>
  markRead: (friendId: string, upToId?: string) => Promise<void>
  sendTyping: (friendId: string, isTyping: boolean) => void
  setActiveFriend: (friendId: string | null) => void
  clearError: () => void
}

let boundSocket: Socket | null = null

const upsertMessage = (
  messages: Record<string, friendsApi.FriendMessagePublic[]>,
  friendId: string,
  message: friendsApi.FriendMessagePublic,
) => {
  const existing = messages[friendId] ?? []
  if (existing.some((item) => item.id === message.id)) return messages
  const next = [...existing, message].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  return { ...messages, [friendId]: next }
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
  searchResults: [],
  messages: {},
  typing: {},
  activeFriendId: null,
  isLoading: false,
  error: null,
  chatConnected: false,
  bindSocket: (socket) => {
    if (boundSocket) {
      boundSocket.off('friends:message')
      boundSocket.off('friends:presence')
      boundSocket.off('friends:error')
      boundSocket.off('connect')
      boundSocket.off('disconnect')
    }
    boundSocket = socket
    if (!socket) {
      set({ chatConnected: false })
      return
    }
    if (socket.connected) {
      set({ chatConnected: true })
    }
    socket.on('connect', () => set({ chatConnected: true }))
    socket.on('disconnect', () => set({ chatConnected: false }))
    socket.on('friends:error', (payload: { message?: string }) => {
      set({ error: payload?.message ?? 'Friends error' })
    })
    socket.on('friends:presence', (payload: { userId?: string; isOnline?: boolean }) => {
      if (!payload?.userId) return
      set((state) => ({
        friends: state.friends.map((friend) =>
          friend.user_id === payload.userId
            ? { ...friend, is_online: Boolean(payload.isOnline) }
            : friend,
        ),
      }))
    })
    socket.on('friends:typing', (payload: { userId?: string; isTyping?: boolean }) => {
      if (!payload?.userId) return
      const userId = payload.userId
      set((state) => ({
        typing: { ...state.typing, [userId]: Boolean(payload.isTyping) },
      }))
    })
    socket.on('friends:read', (payload: { userId?: string; readAt?: string }) => {
      const friendId = payload?.userId
      const readAt = payload?.readAt
      const selfId = useAuthStore.getState().user?.id
      if (!friendId || !readAt || !selfId) return
      set((state) => {
        const list = state.messages[friendId] ?? []
        const next = list.map((msg) => {
          if (msg.sender_id === selfId && !msg.read_at && msg.created_at <= readAt) {
            return { ...msg, read_at: readAt }
          }
          return msg
        })
        return { messages: { ...state.messages, [friendId]: next } }
      })
    })
    socket.on(
      'friends:message',
      (payload: {
        id: string
        senderId: string
        recipientId: string
        message: string
        readAt?: string | null
        createdAt: string
      }) => {
        const selfId = useAuthStore.getState().user?.id
        const targetId =
          selfId && payload.senderId === selfId ? payload.recipientId : payload.senderId
        if (!targetId) return
        const message: friendsApi.FriendMessagePublic = {
          id: payload.id,
          sender_id: payload.senderId,
          recipient_id: payload.recipientId,
          message: payload.message,
          read_at: payload.readAt ?? null,
          created_at: payload.createdAt,
        }
        set((state) => ({
          messages: upsertMessage(state.messages, targetId, message),
        }))
      },
    )
  },
  refreshAll: async () => {
    set({ isLoading: true })
    try {
      const [friends, requests, blocked] = await Promise.all([
        friendsApi.listFriends(),
        friendsApi.listRequests(),
        friendsApi.listBlocked(),
      ])
      set({
        friends,
        incoming: requests.incoming,
        outgoing: requests.outgoing,
        blocked,
        error: null,
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load friends.' })
    } finally {
      set({ isLoading: false })
    }
  },
  search: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    try {
      const results = await friendsApi.searchUsers(query.trim())
      set({ searchResults: results })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Search failed.' })
    }
  },
  sendRequest: async (userId) => {
    await friendsApi.sendRequest(userId)
    await get().refreshAll()
  },
  acceptRequest: async (requestId) => {
    await friendsApi.acceptRequest(requestId)
    await get().refreshAll()
  },
  declineRequest: async (requestId) => {
    await friendsApi.declineRequest(requestId)
    await get().refreshAll()
  },
  cancelRequest: async (requestId) => {
    await friendsApi.cancelRequest(requestId)
    await get().refreshAll()
  },
  removeFriend: async (friendId) => {
    await friendsApi.removeFriend(friendId)
    set((state) => ({
      friends: state.friends.filter((friend) => friend.user_id !== friendId),
      activeFriendId:
        state.activeFriendId === friendId ? null : state.activeFriendId,
    }))
  },
  updateNickname: async (friendId, nickname) => {
    await friendsApi.updateNickname(friendId, nickname)
    set((state) => ({
      friends: state.friends.map((friend) =>
        friend.user_id === friendId ? { ...friend, nickname } : friend,
      ),
    }))
  },
  blockUser: async (userId) => {
    await friendsApi.blockUser(userId)
    await get().refreshAll()
  },
  unblockUser: async (userId) => {
    await friendsApi.unblockUser(userId)
    await get().refreshAll()
  },
  loadMessages: async (friendId) => {
    const response = await friendsApi.getMessages(friendId)
    set((state) => ({
      messages: { ...state.messages, [friendId]: response.messages },
    }))
  },
  sendMessage: async (friendId, message) => {
    const trimmed = message.trim()
    if (!trimmed) return
    const socket = boundSocket
    if (socket?.connected) {
      socket.emit('friends:send', { userId: friendId, message: trimmed })
      return
    }
    const sent = await friendsApi.sendMessage(friendId, trimmed)
    set((state) => ({
      messages: upsertMessage(state.messages, friendId, sent),
    }))
  },
  markRead: async (friendId, upToId) => {
    const result = await friendsApi.markMessagesRead(friendId, upToId)
    const selfId = useAuthStore.getState().user?.id
    if (!selfId) return
    set((state) => {
      const list = state.messages[friendId] ?? []
      const next = list.map((msg) => {
        if (msg.sender_id === friendId && msg.recipient_id === selfId && !msg.read_at) {
          return { ...msg, read_at: result.readAt }
        }
        return msg
      })
      return { messages: { ...state.messages, [friendId]: next } }
    })
    if (boundSocket?.connected) {
      boundSocket.emit('friends:read', { userId: friendId, readAt: result.readAt })
    }
  },
  sendTyping: (friendId, isTyping) => {
    if (boundSocket?.connected) {
      boundSocket.emit('friends:typing', { userId: friendId, isTyping })
    }
  },
  setActiveFriend: (friendId) => set({ activeFriendId: friendId }),
  clearError: () => set({ error: null }),
}))
