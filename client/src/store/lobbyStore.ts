import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import { createSocket } from '../realtime/socket'
import { useAuthStore } from './authStore'

const DEMO_MODE =
  !import.meta.env.PROD &&
  (import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_DEMO_MODE === '1')

const isDemoAccessToken = (token: string | null) =>
  typeof token === 'string' && token.startsWith('demo-access:')

const demoTableSeed: LobbyTableSummary[] = [
  {
    id: 'demo-high-limit',
    name: 'High-limit lounge',
    isPrivate: false,
    maxPlayers: 6,
    playerCount: 3,
  },
  {
    id: 'demo-midnight',
    name: 'Midnight room',
    isPrivate: false,
    maxPlayers: 5,
    playerCount: 2,
  },
  {
    id: 'demo-vip',
    name: 'VIP vault',
    isPrivate: true,
    maxPlayers: 4,
    playerCount: 1,
  },
]

const demoNames = ['Nova', 'Atlas', 'Jinx', 'Sable', 'Rook', 'Ember', 'Zane']

const createDemoId = () =>
  `demo-${Math.random().toString(36).slice(2, 8)}`

const getDemoPlayer = (): TablePlayer => {
  const user = useAuthStore.getState().user
  const displayName =
    user?.profile?.display_name ?? user?.email ?? 'Demo Player'
  return {
    userId: user?.id ?? 'demo-player',
    displayName,
    isReady: false,
  }
}

const createDemoPlayers = (count: number) => {
  const self = getDemoPlayer()
  const total = Math.max(1, count)
  const players: TablePlayer[] = [self]
  for (let index = 1; index < total; index += 1) {
    const name = demoNames[index % demoNames.length]
    players.push({
      userId: `demo-bot-${index}`,
      displayName: name,
      isReady: index % 2 === 0,
    })
  }
  return players
}

type TableConfigPayload = {
  minBet?: number
  maxBet?: number
  decks?: number
  startingBank?: number
}

const buildDemoTableState = (
  summary: LobbyTableSummary,
  overrideCount?: number,
  config?: TableConfigPayload,
): TableState => ({
  id: summary.id,
  name: summary.name,
  isPrivate: summary.isPrivate,
  maxPlayers: summary.maxPlayers,
  inviteCode: summary.isPrivate ? summary.id.slice(0, 6).toUpperCase() : null,
  players: createDemoPlayers(overrideCount ?? summary.playerCount ?? 1),
  minBet: config?.minBet ?? 10,
  maxBet: config?.maxBet ?? 500,
  decks: config?.decks ?? 6,
  startingBank: config?.startingBank ?? 2500,
})

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
  inviteCode?: string | null
  players: TablePlayer[]
  minBet?: number
  maxBet?: number
  decks?: number
  startingBank?: number
}

export type CreateTablePayload = {
  name: string
  maxPlayers: number
  isPrivate: boolean
  minBet: number
  maxBet: number
  decks: number
  startingBank: number
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

  socket.on('table:kicked', () => {
    set({
      currentTableId: null,
      currentTable: null,
      error: 'Removed from table by admin.',
    })
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
    if (DEMO_MODE && isDemoAccessToken(token)) {
      const existing = get().socket
      if (existing) {
        existing.removeAllListeners()
        existing.disconnect()
      }
      set({
        socket: null,
        authToken: token,
        isConnected: true,
        isConnecting: false,
        error: null,
        tables: get().tables.length ? get().tables : demoTableSeed,
        currentTable: null,
        currentTableId: null,
      })
      return
    }

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
    if (DEMO_MODE && isDemoAccessToken(get().authToken)) {
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
      return
    }
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
    if (DEMO_MODE && isDemoAccessToken(get().authToken)) {
      set((state) => ({
        tables: state.tables.length ? state.tables : demoTableSeed,
        error: null,
      }))
      return
    }
    const socket = get().socket
    if (socket?.connected) socket.emit('lobby:list')
  },
  createTable: (payload) => {
    if (DEMO_MODE && isDemoAccessToken(get().authToken)) {
      const id = createDemoId()
      const summary: LobbyTableSummary = {
        id,
        name: payload.name.trim() || 'Private table',
        isPrivate: payload.isPrivate,
        maxPlayers: payload.maxPlayers,
        playerCount: 1,
      }
      const tableState = buildDemoTableState(summary, 1, payload)
      set((state) => ({
        tables: [summary, ...state.tables],
        currentTableId: id,
        currentTable: tableState,
      }))
      return
    }
    const socket = get().socket
    if (socket?.connected) socket.emit('table:create', payload)
  },
  joinTable: (tableId) => {
    if (DEMO_MODE && isDemoAccessToken(get().authToken)) {
      const tables = get().tables
      const trimmed = tableId.trim()
      const summary =
        tables.find((table) => table.id === trimmed) ??
        ({
          id: trimmed.length > 6 ? trimmed : createDemoId(),
          name: 'Private table',
          isPrivate: true,
          maxPlayers: 6,
          playerCount: 1,
        } satisfies LobbyTableSummary)
      const playerCount = Math.max(1, summary.playerCount)
      const tableState = buildDemoTableState(summary, playerCount)
      if (summary.isPrivate && trimmed.length <= 6) {
        tableState.inviteCode = trimmed.toUpperCase()
      }
      set((state) => ({
        tables: state.tables.map((table) =>
          table.id === trimmed
            ? { ...table, playerCount: tableState.players.length }
            : table,
        ),
        currentTableId: tableState.id,
        currentTable: tableState,
        error: null,
      }))
      return
    }
    const socket = get().socket
    if (socket?.connected) {
      const trimmed = tableId.trim()
      const isTableId =
        trimmed.length > 6 || get().tables.some((table) => table.id === trimmed)
      socket.emit('table:join', isTableId ? { tableId: trimmed } : { inviteCode: trimmed })
    }
  },
  leaveTable: () => {
    if (DEMO_MODE && isDemoAccessToken(get().authToken)) {
      set({ currentTable: null, currentTableId: null })
      return
    }
    const socket = get().socket
    if (socket?.connected) socket.emit('table:leave')
    set({ currentTable: null, currentTableId: null })
  },
  setReady: (ready) => {
    if (DEMO_MODE && isDemoAccessToken(get().authToken)) {
      const currentTable = get().currentTable
      if (!currentTable) return
      const selfId = getDemoPlayer().userId
      const players = currentTable.players.map((player) =>
        player.userId === selfId ? { ...player, isReady: ready } : player,
      )
      set({ currentTable: { ...currentTable, players } })
      return
    }
    const socket = get().socket
    if (socket?.connected) socket.emit('table:ready', { ready })
  },
  clearError: () => set({ error: null }),
}))
