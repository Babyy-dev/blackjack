import { create } from 'zustand'
import type { Socket } from 'socket.io-client'

const MESSAGE_LIMIT = 200
const MAX_MESSAGE_LENGTH = 280

export type ChatMessage = {
  id: string
  tableId: string
  userId: string | null
  displayName: string
  message: string
  createdAt: string
  system?: boolean
}

type ChatHistoryPayload = {
  tableId?: string
  messages?: ChatMessage[]
}

type ChatErrorPayload = {
  message?: string
}

type ChatState = {
  socket: Socket | null
  tableId: string | null
  messages: ChatMessage[]
  error: string | null
  isOpen: boolean
  chatConnected: boolean
  bindSocket: (socket: Socket | null, tableId: string | null) => void
  sendMessage: (message: string) => void
  toggleOpen: () => void
  clearError: () => void
}

let boundSocket: Socket | null = null

export const useChatStore = create<ChatState>((set, get) => {
  const handleHistory = (payload: ChatHistoryPayload | null) => {
    if (!payload?.tableId) return
    if (payload.tableId !== get().tableId) return
    const messages = payload.messages ?? []
    set({ messages: messages.slice(-MESSAGE_LIMIT), error: null })
  }

  const handleMessage = (payload: ChatMessage | null) => {
    if (!payload) return
    if (payload.tableId !== get().tableId) return
    set((state) => {
      const next = [...state.messages, payload]
      return { messages: next.slice(-MESSAGE_LIMIT), error: null }
    })
  }

  const handleError = (payload: ChatErrorPayload | null) => {
    set({ error: payload?.message ?? 'Chat error.' })
  }

  const handleConnect = () => {
    set({ chatConnected: true, error: null })
    if (get().socket && get().tableId) {
      get().socket.emit('chat:sync')
    }
  }

  const handleDisconnect = () => {
    set({ chatConnected: false })
  }

  return {
    socket: null,
    tableId: null,
    messages: [],
    error: null,
    isOpen: false,
    chatConnected: false,
    bindSocket: (socket, tableId) => {
      if (boundSocket) {
        boundSocket.off('chat:history', handleHistory)
        boundSocket.off('chat:message', handleMessage)
        boundSocket.off('chat:error', handleError)
        boundSocket.off('connect', handleConnect)
        boundSocket.off('disconnect', handleDisconnect)
      }
      boundSocket = socket
      if (!socket) {
        set({ socket: null, tableId, messages: [], error: null, chatConnected: false })
        return
      }
      const previousTableId = get().tableId
      const nextTableId = tableId ?? null
      if (previousTableId !== nextTableId) {
        set({ messages: [], error: null })
      }
      set({ socket, tableId: nextTableId })
      socket.on('chat:history', handleHistory)
      socket.on('chat:message', handleMessage)
      socket.on('chat:error', handleError)
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      set({ chatConnected: socket.connected })
    },
    sendMessage: (message) => {
      const socket = get().socket
      const tableId = get().tableId
      if (!socket?.connected || !tableId) {
        set({ error: 'Chat is offline. Reconnect to the table.' })
        return
      }
      const trimmed = message.trim()
      if (!trimmed) return
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        set({
          error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).`,
        })
        return
      }
      socket.emit('chat:send', { message: trimmed })
    },
    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    clearError: () => set({ error: null }),
  }
})
