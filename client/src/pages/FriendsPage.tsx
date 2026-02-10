import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import DashboardNav from '../components/DashboardNav'
import { useAuthStore } from '../store/authStore'
import { useFriendsStore } from '../store/friendsStore'
import { useLobbyStore } from '../store/lobbyStore'
import * as friendsApi from '../api/friends'

const FriendsPage = () => {
  const user = useAuthStore((state) => state.user)
  const socket = useLobbyStore((state) => state.socket)
  const currentTableId = useLobbyStore((state) => state.currentTableId)
  const currentTable = useLobbyStore((state) => state.currentTable)

  const {
    friends,
    incoming,
    outgoing,
    blocked,
    searchResults,
    messages,
    typing,
    activeFriendId,
    isLoading,
    error,
    bindSocket,
    refreshAll,
    search,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    updateNickname,
    blockUser,
    unblockUser,
    loadMessages,
    sendMessage,
    markRead,
    sendTyping,
    setActiveFriend,
    clearError,
  } = useFriendsStore()

  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [editingFriendId, setEditingFriendId] = useState<string | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const typingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    bindSocket(socket ?? null)
  }, [bindSocket, socket])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      search('')
      return
    }
    const handle = window.setTimeout(() => {
      void search(trimmed)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [query, search])

  useEffect(() => {
    if (!activeFriendId) return
    void loadMessages(activeFriendId)
  }, [activeFriendId, loadMessages])

  useEffect(() => {
    if (!activeFriendId) return
    const list = messages[activeFriendId] ?? []
    const hasUnread = list.some(
      (msg) => msg.sender_id === activeFriendId && !msg.read_at,
    )
    if (hasUnread) {
      const lastUnread = [...list]
        .reverse()
        .find((msg) => msg.sender_id === activeFriendId && !msg.read_at)
      void markRead(activeFriendId, lastUnread?.id)
    }
  }, [activeFriendId, messages, markRead])

  const activeFriend = friends.find((friend) => friend.user_id === activeFriendId) ?? null
  const activeMessages = activeFriendId ? messages[activeFriendId] ?? [] : []
  const isTyping = activeFriendId ? Boolean(typing[activeFriendId]) : false

  const relationships = useMemo(() => {
    const friendIds = new Set(friends.map((friend) => friend.user_id))
    const outgoingIds = new Set(outgoing.map((req) => req.addressee.user_id))
    const incomingIds = new Set(incoming.map((req) => req.requester.user_id))
    const blockedIds = new Set(blocked.map((entry) => entry.user_id))
    return { friendIds, outgoingIds, incomingIds, blockedIds }
  }, [friends, incoming, outgoing, blocked])

  const handleSendMessage = async () => {
    if (!activeFriendId || !draft.trim()) return
    const text = draft
    setDraft('')
    sendTyping(activeFriendId, false)
    await sendMessage(activeFriendId, text)
  }

  useEffect(() => {
    if (!activeFriendId) return
    if (!draft.trim()) {
      sendTyping(activeFriendId, false)
      return
    }
    sendTyping(activeFriendId, true)
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      sendTyping(activeFriendId, false)
    }, 1200)
  }, [draft, activeFriendId, sendTyping])

  useEffect(() => {
    return () => {
      if (activeFriendId) sendTyping(activeFriendId, false)
    }
  }, [activeFriendId, sendTyping])

  const inviteCode = currentTable?.inviteCode ?? currentTableId
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteLink = inviteCode && origin ? `${origin}/table/${inviteCode}` : null

  const copyInviteLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteMessage('Invite link copied.')
    } catch {
      setInviteMessage('Copy failed. Please copy manually.')
    }
    window.setTimeout(() => setInviteMessage(null), 2000)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setPushSupported(supported)
    if (!supported) return
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setPushEnabled(Boolean(subscription)))
      .catch(() => setPushEnabled(false))
  }, [])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const enablePush = async () => {
    if (!pushSupported || pushLoading) return
    setPushLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const { public_key } = await friendsApi.getPushPublicKey()
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      })
      await friendsApi.subscribePush(subscription.toJSON() as PushSubscription)
      setPushEnabled(true)
    } catch {
      setPushEnabled(false)
    } finally {
      setPushLoading(false)
    }
  }

  const disablePush = async () => {
    if (!pushSupported || pushLoading) return
    setPushLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await friendsApi.unsubscribePush(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setPushEnabled(false)
    } catch {
      setPushEnabled(false)
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#050f15] text-white">
      <AnimatedBackground />
      <DashboardNav />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-white sm:text-5xl">
              Friends
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.25rem] text-white/50">
              Manage your friends, requests, and private messages
            </p>
            {inviteMessage && (
              <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-emerald-300">
                {inviteMessage}
              </p>
            )}
            {pushSupported && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.6rem] uppercase tracking-[0.2rem]">
                <button
                  type="button"
                  onClick={pushEnabled ? disablePush : enablePush}
                  disabled={pushLoading}
                  className="rounded-full border border-amber-300/60 px-3 py-1 text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:opacity-60"
                >
                  {pushEnabled ? 'Disable notifications' : 'Enable notifications'}
                </button>
              </div>
            )}
          </div>
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </div>
        </header>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onClick={clearError}
              className="mt-6 cursor-pointer overflow-hidden rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Search results
              </h2>
              <div className="mt-4 grid gap-3">
                {query.trim().length < 2 && (
                  <p className="text-sm text-white/40">Type at least 2 characters.</p>
                )}
                {query.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-white/40">No players found.</p>
                )}
                {searchResults.map((result) => {
                  const isFriend = relationships.friendIds.has(result.user_id)
                  const isOutgoing = relationships.outgoingIds.has(result.user_id)
                  const isIncoming = relationships.incomingIds.has(result.user_id)
                  const isBlocked = relationships.blockedIds.has(result.user_id)
                  return (
                    <div
                      key={result.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/10" />
                        <div>
                          <p className="text-sm font-semibold text-white">{result.display_name}</p>
                          <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                            {result.is_online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isBlocked ? (
                          <span className="text-xs uppercase tracking-[0.2rem] text-red-200">
                            Blocked
                          </span>
                        ) : isFriend ? (
                          <span className="text-xs uppercase tracking-[0.2rem] text-emerald-300">
                            Friends
                          </span>
                        ) : isIncoming ? (
                          <button
                            onClick={() => {
                              const req = incoming.find(
                                (entry) => entry.requester.user_id === result.user_id,
                              )
                              if (req) void acceptRequest(req.id)
                            }}
                            className="rounded-full bg-emerald-300 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-[#08161c]"
                          >
                            Accept
                          </button>
                        ) : isOutgoing ? (
                          <span className="text-xs uppercase tracking-[0.2rem] text-amber-200">
                            Pending
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => void sendRequest(result.user_id)}
                              className="rounded-full bg-amber-300 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-[#1b1200]"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => void blockUser(result.user_id)}
                              className="rounded-full border border-red-400/50 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-red-200"
                            >
                              Block
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Friends list
              </h2>
              <div className="mt-4 grid gap-3">
                {friends.length === 0 && (
                  <p className="text-sm text-white/40">No friends yet.</p>
                )}
                {friends.map((friend) => (
                  <div
                    key={friend.user_id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3 ${
                      activeFriendId === friend.user_id ? 'border-amber-400/40' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFriend(friend.user_id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative h-10 w-10 rounded-full bg-white/10">
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border border-[#08161c] ${
                            friend.is_online ? 'bg-emerald-300' : 'bg-white/30'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {friend.nickname || friend.display_name}
                        </p>
                        {friend.nickname && (
                          <p className="text-[0.6rem] uppercase tracking-[0.2rem] text-white/40">
                            {friend.display_name}
                          </p>
                        )}
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                          {friend.is_online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveFriend(friend.user_id)}
                        className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                      >
                        Message
                      </button>
                      {inviteLink && (
                        <button
                          onClick={() => void copyInviteLink()}
                          className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                        >
                          Invite
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingFriendId(friend.user_id)
                          setNicknameDraft(friend.nickname ?? '')
                        }}
                        className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                      >
                        Nickname
                      </button>
                      <button
                        onClick={() => void removeFriend(friend.user_id)}
                        className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => void blockUser(friend.user_id)}
                        className="rounded-full border border-red-400/50 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-red-200"
                      >
                        Block
                      </button>
                    </div>
                    {editingFriendId === friend.user_id && (
                      <div className="mt-3 flex w-full flex-wrap items-center gap-3">
                        <input
                          value={nicknameDraft}
                          onChange={(event) => setNicknameDraft(event.target.value)}
                          placeholder="Set a nickname..."
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                        />
                        <button
                          onClick={() => {
                            void updateNickname(
                              friend.user_id,
                              nicknameDraft.trim() || null,
                            )
                            setEditingFriendId(null)
                            setNicknameDraft('')
                          }}
                          className="rounded-full bg-amber-300 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-[#1b1200]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingFriendId(null)
                            setNicknameDraft('')
                          }}
                          className="rounded-full border border-white/20 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Friend requests
              </h2>
              <div className="mt-4 grid gap-3">
                {incoming.length === 0 && outgoing.length === 0 && (
                  <p className="text-sm text-white/40">No pending requests.</p>
                )}
                {incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{req.requester.display_name}</p>
                      <p className="text-xs uppercase tracking-[0.2rem] text-white/40">Incoming</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void acceptRequest(req.id)}
                        className="rounded-full bg-emerald-300 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-[#08161c]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => void declineRequest(req.id)}
                        className="rounded-full border border-white/20 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
                {outgoing.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{req.addressee.display_name}</p>
                      <p className="text-xs uppercase tracking-[0.2rem] text-white/40">Outgoing</p>
                    </div>
                    <button
                      onClick={() => void cancelRequest(req.id)}
                      className="rounded-full border border-white/20 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Direct messages
              </h2>
              <div className="mt-4 flex flex-col gap-4">
                {!activeFriend && (
                  <p className="text-sm text-white/40">Select a friend to start chatting.</p>
                )}
                {activeFriend && (
                  <>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {activeFriend.nickname || activeFriend.display_name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                          {isTyping ? 'Typing...' : activeFriend.is_online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveFriend(null)}
                        className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                      >
                        Close
                      </button>
                    </div>
                    <div className="h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#08161c] p-4">
                      {activeMessages.length === 0 && (
                        <p className="text-sm text-white/40">No messages yet.</p>
                      )}
                      <div className="flex flex-col gap-3">
                        {activeMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                              msg.sender_id === user?.id
                                ? 'self-end bg-amber-300 text-[#1b1200]'
                                : 'self-start bg-white/10 text-white'
                            }`}
                          >
                            {msg.message}
                          </div>
                        ))}
                      </div>
                    </div>
                    {activeMessages.length > 0 && (
                      <div className="text-xs uppercase tracking-[0.2rem] text-white/40">
                        {(() => {
                          const last = [...activeMessages]
                            .reverse()
                            .find((msg) => msg.sender_id === user?.id)
                          if (!last) return 'Sent'
                          return last.read_at ? 'Read' : 'Sent'
                        })()}
                      </div>
                    )}
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        void handleSendMessage()
                      }}
                      className="flex items-center gap-3"
                    >
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-amber-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200]"
                      >
                        Send
                      </button>
                    </form>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Blocked users
              </h2>
              <div className="mt-4 grid gap-3">
                {blocked.length === 0 && (
                  <p className="text-sm text-white/40">No blocked users.</p>
                )}
                {blocked.map((entry) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.display_name}</p>
                      <p className="text-xs uppercase tracking-[0.2rem] text-white/40">Blocked</p>
                    </div>
                    <button
                      onClick={() => void unblockUser(entry.user_id)}
                      className="rounded-full border border-white/20 px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {isLoading && (
          <p className="mt-6 text-xs uppercase tracking-[0.2rem] text-white/40">
            Syncing friends...
          </p>
        )}
      </main>
    </div>
  )
}

export default FriendsPage
