import { io, type Socket } from 'socket.io-client'
import { apiBaseUrl } from '../api/client'

const socketBase = (import.meta.env.VITE_SOCKET_URL ?? apiBaseUrl).replace(/\/$/, '')
const SOCKET_URL =
  socketBase || (typeof window !== 'undefined' ? window.location.origin : '')

export const createSocket = (token: string): Socket => {
  return io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
  })
}
