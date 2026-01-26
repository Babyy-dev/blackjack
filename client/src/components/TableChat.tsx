import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLobbyStore } from '../store/lobbyStore'
import { useChatStore } from '../store/chatStore'

const MAX_MESSAGE_LENGTH = 280

type TableChatProps = {
  variant?: 'default' | 'game'
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const TableChat = ({ variant = 'default' }: TableChatProps) => {
  const socket = useLobbyStore((state) => state.socket)
  const isConnected = useLobbyStore((state) => state.isConnected)
  const tableId = useLobbyStore((state) => state.currentTableId)
  const bindSocket = useChatStore((state) => state.bindSocket)
  const messages = useChatStore((state) => state.messages)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const error = useChatStore((state) => state.error)
  const clearError = useChatStore((state) => state.clearError)
  const isOpen = useChatStore((state) => state.isOpen)
  const toggleOpen = useChatStore((state) => state.toggleOpen)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = useState('')
  const isGame = variant === 'game'

  useEffect(() => {
    bindSocket(socket ?? null, tableId ?? null)
  }, [bindSocket, socket, tableId])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length, isOpen])

  const canSend = useMemo(
    () => Boolean(isConnected && socket?.connected && tableId),
    [isConnected, socket?.connected, tableId],
  )

  const submitMessage = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setDraft('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitMessage()
  }

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value)
    if (error) clearError()
  }

  if (isGame && !isOpen) {
    return (
      <button type="button" className="game-chat__toggle" onClick={toggleOpen}>
        Chat
      </button>
    )
  }

  if (isGame) {
    return (
      <section className="game-chat" aria-live="polite">
        <header className="game-chat__header">
          <div>
            <p className="game-chat__eyebrow">Live table</p>
            <h2 className="game-chat__title">Table chat</h2>
          </div>
          <button type="button" className="game-chat__close" onClick={toggleOpen}>
            Hide
          </button>
        </header>
        {error && <p className="game-chat__error">{error}</p>}
        <div className="game-chat__list" ref={listRef}>
          {messages.length === 0 && (
            <p className="game-chat__empty">No messages yet.</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`game-chat__row ${message.system ? 'system' : ''}`}
            >
              <div className="game-chat__meta">
                <span className="game-chat__name">
                  {message.system ? 'System' : message.displayName}
                </span>
                {message.createdAt && (
                  <span className="game-chat__time">{formatTime(message.createdAt)}</span>
                )}
              </div>
              <p className="game-chat__message">{message.message}</p>
            </div>
          ))}
        </div>
        <form className="game-chat__form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={handleDraftChange}
            placeholder={canSend ? 'Send a message' : 'Connect to chat'}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={!canSend}
            className="game-chat__input"
          />
          <button type="submit" className="game-chat__send" disabled={!canSend}>
            Send
          </button>
        </form>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Live table</p>
          <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
            Table chat
          </h2>
        </div>
        {error && (
          <span className="text-xs uppercase tracking-[0.2rem] text-red-200">
            {error}
          </span>
        )}
      </header>
      <div
        ref={listRef}
        className="mt-5 h-56 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/70"
      >
        {messages.length === 0 && (
          <p className="text-sm text-white/50">No messages yet.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.2rem] text-white/40">
              <span>{message.system ? 'System' : message.displayName}</span>
              {message.createdAt && <span>{formatTime(message.createdAt)}</span>}
            </div>
            <p className={message.system ? 'text-white/50 italic' : 'text-white/80'}>
              {message.message}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder={canSend ? 'Send a message' : 'Connect to chat'}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!canSend}
          className="flex-1 rounded-xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40 disabled:hover:translate-y-0"
        >
          Send
        </button>
      </form>
    </section>
  )
}

export default TableChat
