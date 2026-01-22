import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveAdminWithdrawal,
  banAdminUser,
  adjustAdminWallet,
  forceAdminResult,
  endAdminRound,
  forceAdminStand,
  getAdminCryptoDeposits,
  getAdminCryptoWithdrawals,
  getAdminGameLogs,
  getAdminLogs,
  getAdminOverview,
  getAdminTableDetail,
  getAdminTables,
  getAdminUsers,
  kickAdminTablePlayer,
  lockAdminBetting,
  markAdminWithdrawalPaid,
  muteAdminUser,
  pauseAdminTable,
  rejectAdminWithdrawal,
  restartAdminTable,
  resumeAdminTable,
  revokeAdminSessions,
  unbanAdminUser,
  unmuteAdminUser,
  unlockAdminBetting,
  updateAdminTableRules,
  updateAdminUser,
} from '../api/admin'

const AdminPage = () => {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [ruleDraft, setRuleDraft] = useState({
    minBet: 10,
    maxBet: 500,
    decks: 6,
    startingBank: 2500,
  })
  const [forceResult, setForceResult] = useState<
    'dealer_win' | 'player_win' | 'push' | 'dealer_blackjack' | 'dealer_bust'
  >('dealer_win')
  const [withdrawalTxHashes, setWithdrawalTxHashes] = useState<Record<string, string>>({})
  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: getAdminOverview,
  })
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
  })
  const tablesQuery = useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: getAdminTables,
    refetchInterval: 5000,
  })
  const tableDetailQuery = useQuery({
    queryKey: ['admin', 'table', selectedTableId],
    queryFn: () => getAdminTableDetail(selectedTableId as string),
    enabled: Boolean(selectedTableId),
    refetchInterval: 4000,
  })
  const adminLogsQuery = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () => getAdminLogs(50),
    refetchInterval: 10000,
  })
  const gameLogsQuery = useQuery({
    queryKey: ['admin', 'gameLogs', selectedTableId],
    queryFn: () => getAdminGameLogs({ tableId: selectedTableId ?? undefined, limit: 50 }),
    refetchInterval: 10000,
  })
  const cryptoDepositsQuery = useQuery({
    queryKey: ['admin', 'crypto', 'deposits'],
    queryFn: () => getAdminCryptoDeposits(50),
    refetchInterval: 15000,
  })
  const cryptoWithdrawalsQuery = useQuery({
    queryKey: ['admin', 'crypto', 'withdrawals'],
    queryFn: () => getAdminCryptoWithdrawals(50),
    refetchInterval: 15000,
  })

  const handleActionError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Action failed.'
    setActionError(message)
    window.setTimeout(() => setActionError(null), 4000)
  }

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { is_active?: boolean; is_admin?: boolean } }) =>
      updateAdminUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: handleActionError,
  })

  const revokeSessionsMutation = useMutation({
    mutationFn: (userId: string) => revokeAdminSessions(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: handleActionError,
  })

  const muteUserMutation = useMutation({
    mutationFn: ({ userId, minutes }: { userId: string; minutes: number }) =>
      muteAdminUser(userId, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: handleActionError,
  })

  const unmuteUserMutation = useMutation({
    mutationFn: (userId: string) => unmuteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: handleActionError,
  })

  const banUserMutation = useMutation({
    mutationFn: ({ userId, minutes }: { userId: string; minutes?: number }) =>
      banAdminUser(userId, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: handleActionError,
  })

  const unbanUserMutation = useMutation({
    mutationFn: (userId: string) => unbanAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: handleActionError,
  })

  const adjustWalletMutation = useMutation({
    mutationFn: ({
      userId,
      amount,
    }: {
      userId: string
      amount: number
    }) =>
      adjustAdminWallet(userId, {
        action: 'credit',
        amount,
        reason: 'Admin credit',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: handleActionError,
  })

  const kickPlayerMutation = useMutation({
    mutationFn: ({ tableId, userId }: { tableId: string; userId: string }) =>
      kickAdminTablePlayer(tableId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', variables.tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const forceStandMutation = useMutation({
    mutationFn: ({ tableId, userId }: { tableId: string; userId?: string }) =>
      forceAdminStand(tableId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', variables.tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'gameLogs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const endRoundMutation = useMutation({
    mutationFn: (tableId: string) => endAdminRound(tableId),
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'gameLogs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const pauseTableMutation = useMutation({
    mutationFn: (tableId: string) => pauseAdminTable(tableId),
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
    },
    onError: handleActionError,
  })

  const resumeTableMutation = useMutation({
    mutationFn: (tableId: string) => resumeAdminTable(tableId),
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
    },
    onError: handleActionError,
  })

  const restartTableMutation = useMutation({
    mutationFn: (tableId: string) => restartAdminTable(tableId),
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'gameLogs'] })
    },
    onError: handleActionError,
  })

  const lockBettingMutation = useMutation({
    mutationFn: (tableId: string) => lockAdminBetting(tableId),
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
    },
    onError: handleActionError,
  })

  const unlockBettingMutation = useMutation({
    mutationFn: (tableId: string) => unlockAdminBetting(tableId),
    onSuccess: (_, tableId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
    },
    onError: handleActionError,
  })

  const updateRulesMutation = useMutation({
    mutationFn: ({ tableId, payload }: { tableId: string; payload: { min_bet?: number; max_bet?: number; decks?: number; starting_bank?: number } }) =>
      updateAdminTableRules(tableId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', variables.tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] })
    },
    onError: handleActionError,
  })

  const forceResultMutation = useMutation({
    mutationFn: ({ tableId, result }: { tableId: string; result: 'dealer_win' | 'player_win' | 'push' | 'dealer_blackjack' | 'dealer_bust' }) =>
      forceAdminResult(tableId, { result }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table', variables.tableId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'gameLogs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const approveWithdrawalMutation = useMutation({
    mutationFn: (withdrawalId: string) => approveAdminWithdrawal(withdrawalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'crypto', 'withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const rejectWithdrawalMutation = useMutation({
    mutationFn: (withdrawalId: string) => rejectAdminWithdrawal(withdrawalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'crypto', 'withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const markPaidWithdrawalMutation = useMutation({
    mutationFn: ({ withdrawalId, txHash }: { withdrawalId: string; txHash?: string }) =>
      markAdminWithdrawalPaid(withdrawalId, txHash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'crypto', 'withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] })
    },
    onError: handleActionError,
  })

  const overview = overviewQuery.data
  const users = usersQuery.data ?? []
  const tables = tablesQuery.data ?? []
  const tableDetail = tableDetailQuery.data ?? null
  const adminLogs = adminLogsQuery.data ?? []
  const gameLogs = gameLogsQuery.data ?? []
  const cryptoDeposits = cryptoDepositsQuery.data ?? []
  const cryptoWithdrawals = cryptoWithdrawalsQuery.data ?? []
  const recentTransactions = overview?.recent_transactions ?? 0
  const isActionPending =
    updateUserMutation.isPending ||
    revokeSessionsMutation.isPending ||
    muteUserMutation.isPending ||
    unmuteUserMutation.isPending ||
    banUserMutation.isPending ||
    unbanUserMutation.isPending ||
    adjustWalletMutation.isPending ||
    kickPlayerMutation.isPending ||
    forceStandMutation.isPending ||
    endRoundMutation.isPending ||
    pauseTableMutation.isPending ||
    resumeTableMutation.isPending ||
    restartTableMutation.isPending ||
    lockBettingMutation.isPending ||
    unlockBettingMutation.isPending ||
    updateRulesMutation.isPending ||
    forceResultMutation.isPending ||
    approveWithdrawalMutation.isPending ||
    rejectWithdrawalMutation.isPending ||
    markPaidWithdrawalMutation.isPending

  useEffect(() => {
    if (!tables.length) {
      setSelectedTableId(null)
      return
    }
    if (!selectedTableId) {
      setSelectedTableId(tables[0].id)
      return
    }
    if (!tables.some((table) => table.id === selectedTableId)) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  useEffect(() => {
    if (!tableDetail?.table) return
    setRuleDraft({
      minBet: tableDetail.table.min_bet ?? 10,
      maxBet: tableDetail.table.max_bet ?? 500,
      decks: tableDetail.table.decks ?? 6,
      startingBank: tableDetail.table.starting_bank ?? 2500,
    })
  }, [tableDetail?.table.id])

  const formatTimestamp = (value?: string) =>
    value ? new Date(value).toLocaleString() : 'Unknown time'

  const formatPayload = (payload: Record<string, unknown>) => {
    try {
      const text = JSON.stringify(payload)
      if (!text || text === '{}' || text === '[]') return null
      return text.length > 120 ? `${text.slice(0, 120)}...` : text
    } catch {
      return null
    }
  }

  const gameState = tableDetail?.game_state ?? null
  const activePlayerId =
    gameState && typeof gameState.activePlayerId === 'string'
      ? gameState.activePlayerId
      : null
  const activePlayer = tableDetail?.players.find(
    (player) => player.user_id === activePlayerId,
  )
  const gameStatus =
    gameState && typeof gameState.status === 'string' ? gameState.status : 'unknown'
  const turnEndsAt =
    gameState && typeof gameState.turnEndsAt === 'string' ? gameState.turnEndsAt : null
  const minBet =
    gameState && typeof gameState.minBet === 'number' ? gameState.minBet : null
  const maxBet =
    gameState && typeof gameState.maxBet === 'number' ? gameState.maxBet : null

  const sections = [
    { id: 'overview', label: 'Overview', helper: 'Totals and health.' },
    { id: 'users', label: 'User management', helper: 'Accounts, roles, access.' },
    { id: 'live', label: 'Live tables', helper: 'Realtime table monitor.' },
    { id: 'economy', label: 'Economy', helper: 'Balances and payouts.' },
    { id: 'crypto', label: 'Crypto', helper: 'Deposits and withdrawals.' },
    { id: 'referrals', label: 'Referrals', helper: 'Invite and reward rules.' },
    { id: 'security', label: 'Security', helper: 'Anti-cheat and bans.' },
    { id: 'rng', label: 'RNG tools', helper: 'Shuffle verification.' },
    { id: 'system', label: 'System', helper: 'Flags and maintenance.' },
    { id: 'logs', label: 'Logs', helper: 'Audits and history.' },
  ]

  return (
    <div className="mx-auto flex w-full flex-col gap-10 px-6 py-10 sm:py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">Admin</p>
        <h1 className="text-3xl font-display uppercase tracking-[0.25rem] text-white sm:text-4xl sm:tracking-[0.3rem]">
          Control room
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Monitor live activity, manage balances, and keep tables secure.
        </p>
        {actionError && (
          <p className="mt-3 text-xs uppercase tracking-[0.2rem] text-red-200">
            {actionError}
          </p>
        )}
        {overviewQuery.isError && (
          <p className="mt-3 text-xs uppercase tracking-[0.2rem] text-red-200">
            Overview unavailable.
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2rem] text-white/60 sm:p-5 lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">
            Sections
          </p>
          <nav className="mt-4 space-y-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-2xl border border-white/10 px-4 py-3 text-[0.65rem] text-white/70 transition hover:border-amber-300/40 hover:text-amber-200"
              >
                <span className="block text-[0.7rem] font-semibold text-white">
                  {section.label}
                </span>
                <span className="mt-2 block text-[0.6rem] uppercase tracking-[0.18rem] text-white/40">
                  {section.helper}
                </span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-10">
          <section id="overview" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Platform overview
              </h2>
              {overviewQuery.isError && (
                <span className="text-xs uppercase tracking-[0.2rem] text-red-200">
                  Unavailable
                </span>
              )}
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-4">
              {[
                { label: 'Total players', value: overview?.user_count ?? 0 },
                { label: 'Active sessions', value: overview?.active_sessions ?? 0 },
                { label: 'Wallets', value: overview?.wallet_count ?? 0 },
                { label: '24h transactions', value: recentTransactions },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/10 bg-[#08161c] p-4 sm:p-5"
                >
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    {card.label}
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="users" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                User management
              </h2>
              {usersQuery.isLoading && (
                <span className="text-xs uppercase tracking-[0.2rem] text-white/50">
                  Loading
                </span>
              )}
              {usersQuery.isError && (
                <span className="text-xs uppercase tracking-[0.2rem] text-red-200">
                  Unavailable
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/60">
              Review player profiles, roles, and wallet balances.
            </p>
            <div className="mt-6 space-y-3">
              {users.length === 0 && !usersQuery.isLoading && (
                <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
                  No users found yet.
                </div>
              )}
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white/70"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{user.display_name}</p>
                    <p className="break-all text-[0.6rem] uppercase tracking-[0.18rem] text-white/40 sm:text-xs sm:tracking-[0.2rem]">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2rem]">
                    <span
                      className={
                        user.is_banned
                          ? 'text-red-200'
                          : user.is_active
                            ? 'text-emerald-300'
                            : 'text-white/40'
                      }
                    >
                      {user.is_banned ? 'Banned' : user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={user.is_admin ? 'text-amber-300' : 'text-white/40'}>
                      {user.is_admin ? 'Admin' : user.role}
                    </span>
                    {user.muted_until && (
                      <span className="text-amber-200">Muted</span>
                    )}
                    <span className="text-white/50">{user.wallet_balance} TOKEN</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.2rem]">
                    <button
                      onClick={() =>
                        updateUserMutation.mutate({
                          userId: user.id,
                          payload: { is_active: !user.is_active },
                        })
                      }
                      disabled={isActionPending}
                      className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() =>
                        updateUserMutation.mutate({
                          userId: user.id,
                          payload: { is_admin: !user.is_admin },
                        })
                      }
                      disabled={isActionPending}
                      className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      {user.is_admin ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button
                      onClick={() => revokeSessionsMutation.mutate(user.id)}
                      disabled={isActionPending}
                      className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      Reset session
                    </button>
                    <button
                      onClick={() => muteUserMutation.mutate({ userId: user.id, minutes: 10 })}
                      disabled={isActionPending || Boolean(user.muted_until)}
                      className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      Mute 10m
                    </button>
                    <button
                      onClick={() => unmuteUserMutation.mutate(user.id)}
                      disabled={isActionPending || !user.muted_until}
                      className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      Unmute
                    </button>
                    <button
                      onClick={() => banUserMutation.mutate({ userId: user.id, minutes: 1440 })}
                      disabled={isActionPending || user.is_banned}
                      className="rounded-full border border-red-400/50 px-3 py-1 text-red-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      Ban 24h
                    </button>
                    <button
                      onClick={() => unbanUserMutation.mutate(user.id)}
                      disabled={isActionPending || !user.is_banned}
                      className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-emerald-300/70 hover:text-emerald-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      Unban
                    </button>
                    <button
                      onClick={() => adjustWalletMutation.mutate({ userId: user.id, amount: 1000 })}
                      disabled={isActionPending}
                      className="rounded-full border border-amber-300/60 px-3 py-1 text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      Credit +1000
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 text-xs uppercase tracking-[0.2rem] text-white/60 md:grid-cols-2">
              {['Kick', 'Mute', 'Temporary ban', 'Reset session'].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
                >
                  <span>{item}</span>
                  <span className="text-white/30">Queued</span>
                </div>
              ))}
            </div>
          </section>

          <section id="live" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Live table monitor
              </h2>
              {tablesQuery.isLoading && (
                <span className="text-xs uppercase tracking-[0.2rem] text-white/50">
                  Loading
                </span>
              )}
              {tablesQuery.isError && (
                <span className="text-xs uppercase tracking-[0.2rem] text-red-200">
                  Unavailable
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/60">
              Track active tables, bets, and dealer state in real time.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="space-y-3">
                {tables.length === 0 && !tablesQuery.isLoading && (
                  <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
                    No active tables yet.
                  </div>
                )}
                {tables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedTableId(table.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-xs uppercase tracking-[0.2rem] transition ${
                      selectedTableId === table.id
                        ? 'border-amber-300/70 bg-amber-300/10 text-amber-100'
                        : 'border-white/10 bg-[#08161c] text-white/60 hover:border-amber-300/40 hover:text-amber-200'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">
                      {table.name}
                    </span>
                    <span className="mt-2 block text-[0.6rem] text-white/40">
                      {table.player_count}/{table.max_players} players •{' '}
                      {table.is_private ? 'Private' : 'Public'}
                    </span>
                    <span className="mt-1 block text-[0.55rem] uppercase tracking-[0.18rem] text-white/30">
                      {table.is_paused
                        ? 'Paused'
                        : table.round_active
                          ? 'Round live'
                          : 'Waiting'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60 sm:px-5 sm:py-5">
                {!selectedTableId && (
                  <p className="text-sm text-white/60">Select a table to inspect.</p>
                )}
                {selectedTableId && tableDetailQuery.isLoading && (
                  <p className="text-sm text-white/60">Loading table snapshot...</p>
                )}
                {selectedTableId && tableDetailQuery.isError && (
                  <p className="text-sm text-red-200">Unable to load table details.</p>
                )}
                {tableDetail && !tableDetailQuery.isLoading && !tableDetailQuery.isError && (
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                          Table
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {tableDetail.table.name}
                        </p>
                      </div>
                      <div className="text-right text-xs uppercase tracking-[0.2rem] text-white/50">
                        {tableDetail.table.is_private ? 'Private' : 'Public'}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.6rem] uppercase tracking-[0.2rem]">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                        Players {tableDetail.table.player_count}/{tableDetail.table.max_players}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                        {tableDetail.table.round_active ? 'Round live' : 'Waiting'}
                      </span>
                      {tableDetail.table.invite_code && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                          Invite {tableDetail.table.invite_code}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                          Game state
                        </p>
                        <p className="mt-3 text-sm text-white/80">
                          Status:{' '}
                          <span className="font-semibold text-white">{gameStatus}</span>
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-white/50">
                          Active:{' '}
                          <span className="text-white">
                            {activePlayer?.display_name ?? 'None'}
                          </span>
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-white/50">
                          Turn ends:{' '}
                          <span className="text-white">
                            {turnEndsAt ? formatTimestamp(turnEndsAt) : 'N/A'}
                          </span>
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-white/50">
                          Bets:{' '}
                          <span className="text-white">
                            {minBet ?? 'N/A'} - {maxBet ?? 'N/A'}
                          </span>
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-white/50">
                          Paused:{' '}
                          <span className="text-white">
                            {tableDetail.table.is_paused ? 'Yes' : 'No'}
                          </span>
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-white/50">
                          Betting locked:{' '}
                          <span className="text-white">
                            {tableDetail.table.betting_locked ? 'Yes' : 'No'}
                          </span>
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                          Actions
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.2rem]">
                          <button
                            onClick={() =>
                              tableDetail.table.is_paused
                                ? resumeTableMutation.mutate(tableDetail.table.id)
                                : pauseTableMutation.mutate(tableDetail.table.id)
                            }
                            disabled={isActionPending}
                            className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                          >
                            {tableDetail.table.is_paused ? 'Resume' : 'Pause'}
                          </button>
                          <button
                            onClick={() =>
                              tableDetail.table.betting_locked
                                ? unlockBettingMutation.mutate(tableDetail.table.id)
                                : lockBettingMutation.mutate(tableDetail.table.id)
                            }
                            disabled={isActionPending}
                            className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                          >
                            {tableDetail.table.betting_locked ? 'Unlock bets' : 'Lock bets'}
                          </button>
                          <button
                            onClick={() => restartTableMutation.mutate(tableDetail.table.id)}
                            disabled={isActionPending}
                            className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                          >
                            Restart
                          </button>
                          <button
                            onClick={() =>
                              forceStandMutation.mutate({ tableId: tableDetail.table.id })
                            }
                            disabled={isActionPending}
                            className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                          >
                            Force stand
                          </button>
                          <button
                            onClick={() => endRoundMutation.mutate(tableDetail.table.id)}
                            disabled={isActionPending}
                            className="rounded-full border border-amber-300/60 px-3 py-1 text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                          >
                            End round
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                          Table rules
                        </p>
                        <div className="mt-3 grid gap-2 text-[0.6rem] uppercase tracking-[0.2rem] text-white/60">
                          <label className="flex flex-col gap-2">
                            Min bet
                            <input
                              type="number"
                              value={ruleDraft.minBet}
                              min={1}
                              onChange={(event) =>
                                setRuleDraft((state) => ({
                                  ...state,
                                  minBet: Number(event.target.value),
                                }))
                              }
                              className="rounded-lg border border-white/10 bg-[#08161c] px-3 py-2 text-xs text-white"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            Max bet
                            <input
                              type="number"
                              value={ruleDraft.maxBet}
                              min={ruleDraft.minBet}
                              onChange={(event) =>
                                setRuleDraft((state) => ({
                                  ...state,
                                  maxBet: Number(event.target.value),
                                }))
                              }
                              className="rounded-lg border border-white/10 bg-[#08161c] px-3 py-2 text-xs text-white"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            Decks
                            <input
                              type="number"
                              value={ruleDraft.decks}
                              min={1}
                              max={8}
                              onChange={(event) =>
                                setRuleDraft((state) => ({
                                  ...state,
                                  decks: Number(event.target.value),
                                }))
                              }
                              className="rounded-lg border border-white/10 bg-[#08161c] px-3 py-2 text-xs text-white"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            Starting bank
                            <input
                              type="number"
                              value={ruleDraft.startingBank}
                              min={1}
                              onChange={(event) =>
                                setRuleDraft((state) => ({
                                  ...state,
                                  startingBank: Number(event.target.value),
                                }))
                              }
                              className="rounded-lg border border-white/10 bg-[#08161c] px-3 py-2 text-xs text-white"
                            />
                          </label>
                        </div>
                        <button
                          onClick={() =>
                            updateRulesMutation.mutate({
                              tableId: tableDetail.table.id,
                              payload: {
                                min_bet: ruleDraft.minBet,
                                max_bet: ruleDraft.maxBet,
                                decks: ruleDraft.decks,
                                starting_bank: ruleDraft.startingBank,
                              },
                            })
                          }
                          disabled={isActionPending}
                          className="mt-4 rounded-full border border-amber-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                        >
                          Update rules
                        </button>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                          Force result
                        </p>
                        <select
                          value={forceResult}
                          onChange={(event) =>
                            setForceResult(
                              event.target.value as
                                | 'dealer_win'
                                | 'player_win'
                                | 'push'
                                | 'dealer_blackjack'
                                | 'dealer_bust',
                            )
                          }
                          className="mt-3 w-full rounded-lg border border-white/10 bg-[#08161c] px-3 py-2 text-xs uppercase tracking-[0.2rem] text-white"
                        >
                          <option value="dealer_win">Dealer win</option>
                          <option value="player_win">Player win</option>
                          <option value="push">Push</option>
                          <option value="dealer_blackjack">Dealer blackjack</option>
                          <option value="dealer_bust">Dealer bust</option>
                        </select>
                        <button
                          onClick={() =>
                            forceResultMutation.mutate({
                              tableId: tableDetail.table.id,
                              result: forceResult,
                            })
                          }
                          disabled={isActionPending}
                          className="mt-4 rounded-full border border-red-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-red-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                        >
                          Apply result
                        </button>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {tableDetail.players.map((player) => (
                        <div
                          key={player.user_id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {player.display_name}
                            </p>
                            <p className="break-all text-[0.6rem] uppercase tracking-[0.18rem] text-white/40 sm:text-xs sm:tracking-[0.2rem]">
                              {player.user_id}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.2rem]">
                            <span
                              className={
                                player.is_ready ? 'text-emerald-300' : 'text-white/40'
                              }
                            >
                              {player.is_ready ? 'Ready' : 'Not ready'}
                            </span>
                            <button
                              onClick={() =>
                                kickPlayerMutation.mutate({
                                  tableId: tableDetail.table.id,
                                  userId: player.user_id,
                                })
                              }
                              disabled={isActionPending}
                              className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-red-200/70 hover:text-red-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                            >
                              Kick
                            </button>
                            <button
                              onClick={() =>
                                forceStandMutation.mutate({
                                  tableId: tableDetail.table.id,
                                  userId: player.user_id,
                                })
                              }
                              disabled={isActionPending}
                              className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                            >
                              Force stand
                            </button>
                          </div>
                        </div>
                      ))}
                      {tableDetail.players.length === 0 && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
                          No players seated.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="economy" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              Economy control
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Balance adjustments, refunds, and suspicious activity alerts.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Pending reviews', value: 2 },
                { label: 'Recent transactions', value: recentTransactions },
                { label: 'Locked wallets', value: 0 },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/10 bg-[#08161c] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    {card.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="crypto" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              Crypto gateway
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Approve withdrawals and verify inbound transactions.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Deposits
                  </p>
                  {cryptoDepositsQuery.isLoading && (
                    <span className="text-[0.6rem] uppercase tracking-[0.2rem] text-white/40">
                      Loading
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  {cryptoDeposits.length === 0 && !cryptoDepositsQuery.isLoading && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                      No deposits yet.
                    </div>
                  )}
                  {cryptoDeposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                        {deposit.chain} • {deposit.amount_tokens} TOKEN
                      </p>
                      <p className="mt-2 break-all text-[0.6rem] text-white/40">
                        {deposit.address}
                      </p>
                      <p className="mt-1 break-all text-[0.6rem] text-white/30">
                        {deposit.tx_hash}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Withdrawals
                  </p>
                  {cryptoWithdrawalsQuery.isLoading && (
                    <span className="text-[0.6rem] uppercase tracking-[0.2rem] text-white/40">
                      Loading
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  {cryptoWithdrawals.length === 0 && !cryptoWithdrawalsQuery.isLoading && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                      No withdrawal requests.
                    </div>
                  )}
                  {cryptoWithdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                        {withdrawal.chain} • {withdrawal.amount_tokens} TOKEN •{' '}
                        {withdrawal.status}
                      </p>
                      <p className="mt-2 break-all text-[0.6rem] text-white/40">
                        {withdrawal.address}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.2rem]">
                        <button
                          onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                          disabled={isActionPending}
                          className="rounded-full border border-emerald-300/60 px-3 py-1 text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectWithdrawalMutation.mutate(withdrawal.id)}
                          disabled={isActionPending}
                          className="rounded-full border border-red-300/60 px-3 py-1 text-red-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                        >
                          Reject
                        </button>
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={withdrawalTxHashes[withdrawal.id] ?? ''}
                            onChange={(event) =>
                              setWithdrawalTxHashes((state) => ({
                                ...state,
                                [withdrawal.id]: event.target.value,
                              }))
                            }
                            placeholder="TX hash (optional)"
                            className="min-w-[140px] flex-1 rounded-full border border-white/10 bg-[#0d1f27] px-3 py-1 text-[0.6rem] text-white/70"
                          />
                          <button
                            onClick={() =>
                              markPaidWithdrawalMutation.mutate({
                                withdrawalId: withdrawal.id,
                                txHash: withdrawalTxHashes[withdrawal.id],
                              })
                            }
                            disabled={isActionPending}
                            className="rounded-full border border-amber-300/60 px-3 py-1 text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                          >
                            Mark paid
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="referrals" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              Referral oversight
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Track referral rewards and spot abuse patterns.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              Referral analytics will appear here once tracking is enabled.
            </div>
          </section>

          <section id="security" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              Security and anti-cheat
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Monitor bans, device flags, and suspicious sessions.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Active bans', value: 0 },
                { label: 'Flagged devices', value: 0 },
                { label: 'Open audits', value: 1 },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/10 bg-[#08161c] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    {card.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="rng" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              RNG and fairness
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Verify shuffles, view deck snapshots, and confirm game integrity.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              Read-only tools will appear in staging environments.
            </div>
          </section>

          <section id="system" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
              System controls
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Toggle feature flags, broadcasts, and maintenance mode.
            </p>
            <div className="mt-6 grid gap-4 text-xs uppercase tracking-[0.2rem] text-white/60 md:grid-cols-2">
              {['Broadcast message', 'Enable feature', 'Maintenance mode', 'Restart server'].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
                  >
                    <span>{item}</span>
                    <span className="text-white/30">Queued</span>
                  </div>
                ),
              )}
            </div>
          </section>

          <section id="logs" className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display uppercase tracking-[0.2rem] text-white sm:text-xl">
                Logs and audits
              </h2>
              <span className="text-xs uppercase tracking-[0.2rem] text-white/40">
                Latest 50
              </span>
            </div>
            <p className="mt-2 text-sm text-white/60">
              Track admin actions, security events, and game history.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Admin actions
                  </p>
                  {adminLogsQuery.isLoading && (
                    <span className="text-[0.6rem] uppercase tracking-[0.2rem] text-white/40">
                      Loading
                    </span>
                  )}
                  {adminLogsQuery.isError && (
                    <span className="text-[0.6rem] uppercase tracking-[0.2rem] text-red-200">
                      Unavailable
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {adminLogs.length === 0 && !adminLogsQuery.isLoading && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                      No admin logs yet.
                    </div>
                  )}
                  {adminLogs.map((log) => {
                    const payloadText = formatPayload(log.payload)
                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
                      >
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                          {log.action}
                        </p>
                        <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18rem] text-white/40">
                          User: {log.target_user_id ?? 'N/A'} • Table:{' '}
                          {log.target_table_id ?? 'N/A'}
                        </p>
                        {payloadText && (
                          <p className="mt-2 break-all text-[0.6rem] text-white/40">
                            {payloadText}
                          </p>
                        )}
                        <p className="mt-2 text-[0.6rem] text-white/30">
                          {formatTimestamp(log.created_at)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    Game events
                  </p>
                  {gameLogsQuery.isLoading && (
                    <span className="text-[0.6rem] uppercase tracking-[0.2rem] text-white/40">
                      Loading
                    </span>
                  )}
                  {gameLogsQuery.isError && (
                    <span className="text-[0.6rem] uppercase tracking-[0.2rem] text-red-200">
                      Unavailable
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {gameLogs.length === 0 && !gameLogsQuery.isLoading && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                      No game events yet.
                    </div>
                  )}
                  {gameLogs.map((log) => {
                    const payloadText = formatPayload(log.payload)
                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
                      >
                        <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                          {log.action}
                        </p>
                        <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18rem] text-white/40">
                          Table: {log.table_id} • User: {log.user_id ?? 'N/A'}
                        </p>
                        {payloadText && (
                          <p className="mt-2 break-all text-[0.6rem] text-white/40">
                            {payloadText}
                          </p>
                        )}
                        <p className="mt-2 text-[0.6rem] text-white/30">
                          {formatTimestamp(log.created_at)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
