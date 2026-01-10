import { io, type Socket } from 'socket.io-client'
import { apiBaseUrl } from '../api/client'

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? apiBaseUrl).replace(/\/$/, '')

export const createSocket = (token: string): Socket => {
  return io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
  })
}
