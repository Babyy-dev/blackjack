import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import { createSocket } from '../realtime/socket'

export type LobbyTableSummary = {
  id: string
  name: string
  isPrivate: boolean
  maxPlayers: number
  playerCount: number
}

export type TablePlayer = {
  userId: string
  displayName: string
  isReady: boolean
}

export type TableState = {
  id: string
  name: string
  isPrivate: boolean
  maxPlayers: number
  players: TablePlayer[]
}

export type CreateTablePayload = {
  name: string
  maxPlayers: number
  isPrivate: boolean
}

type LobbyState = {
  socket: Socket | null
  authToken: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  tables: LobbyTableSummary[]
  currentTableId: string | null
  currentTable: TableState | null
  connect: (token: string) => void
  disconnect: () => void
  refreshLobby: () => void
  createTable: (payload: CreateTablePayload) => void
  joinTable: (tableId: string) => void
  leaveTable: () => void
  setReady: (ready: boolean) => void
  clearError: () => void
}

const wireSocket = (
  socket: Socket,
  set: (state: Partial<LobbyState>) => void,
  get: () => LobbyState,
) => {
  socket.on('connect', () => {
    set({ isConnected: true, isConnecting: false, error: null })
    socket.emit('lobby:list')
  })

  socket.on('disconnect', () => {
    set({ isConnected: false })
  })

  socket.on('connect_error', (error: Error) => {
    set({ isConnecting: false, isConnected: false, error: error.message })
  })

  socket.on('lobby:snapshot', (payload: { tables?: LobbyTableSummary[] } | null) => {
    set({ tables: payload?.tables ?? [] })
  })

  socket.on('table:state', (payload: TableState | null) => {
    const currentId = payload?.id ?? get().currentTableId
    set({ currentTable: payload ?? null, currentTableId: currentId ?? null })
  })

  socket.on('table:joined', (payload: { tableId?: string } | null) => {
    if (payload?.tableId) {
      set({ currentTableId: payload.tableId })
    }
  })

  socket.on('table:error', (payload: { message?: string } | null) => {
    set({ error: payload?.message ?? 'Table error' })
  })
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  socket: null,
  authToken: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  tables: [],
  currentTableId: null,
  currentTable: null,
  connect: (token) => {
    const existing = get().socket
    const existingToken = get().authToken
    if (existing && existingToken === token) {
      if (!existing.connected) {
        set({ isConnecting: true })
        existing.connect()
      }
      return
    }

    if (existing) {
      existing.removeAllListeners()
      existing.disconnect()
    }

    const socket = createSocket(token)
    wireSocket(socket, set, get)
    set({ socket, authToken: token, isConnecting: true, error: null })
    socket.connect()
  },
  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }
    set({
      socket: null,
      authToken: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      tables: [],
      currentTable: null,
      currentTableId: null,
    })
  },
  refreshLobby: () => {
    const socket = get().socket
    if (socket?.connected) socket.emit('lobby:list')
  },
  createTable: (payload) => {
    const socket = get().socket
    if (socket?.connected) socket.emit('table:create', payload)
  },
  joinTable: (tableId) => {
    const socket = get().socket
    if (socket?.connected) socket.emit('table:join', { tableId })
  },
  leaveTable: () => {
    const socket = get().socket
    if (socket?.connected) socket.emit('table:leave')
    set({ currentTable: null, currentTableId: null })
  },
  setReady: (ready) => {
    const socket = get().socket
    if (socket?.connected) socket.emit('table:ready', { ready })
  },
  clearError: () => set({ error: null }),
}))
