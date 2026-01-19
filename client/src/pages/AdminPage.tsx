import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustAdminWallet,
  getAdminOverview,
  getAdminUsers,
  revokeAdminSessions,
  updateAdminUser,
} from '../api/admin'

const AdminPage = () => {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: getAdminOverview,
  })
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
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

  const overview = overviewQuery.data
  const users = usersQuery.data ?? []
  const recentTransactions = overview?.recent_transactions ?? 0
  const isActionPending =
    updateUserMutation.isPending ||
    revokeSessionsMutation.isPending ||
    adjustWalletMutation.isPending

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
    <div className="mx-auto flex w-full flex-col gap-10 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">Admin</p>
        <h1 className="text-4xl font-display uppercase tracking-[0.3rem] text-white">
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
        <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-5 text-xs uppercase tracking-[0.2rem] text-white/60 lg:sticky lg:top-24">
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
          <section id="overview" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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
                  className="rounded-2xl border border-white/10 bg-[#08161c] p-5"
                >
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/60">
                    {card.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="users" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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
                    <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2rem]">
                    <span className={user.is_active ? 'text-emerald-300' : 'text-red-200'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={user.is_admin ? 'text-amber-300' : 'text-white/40'}>
                      {user.is_admin ? 'Admin' : user.role}
                    </span>
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

          <section id="live" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              Live table monitor
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Track active tables, bets, and dealer state in real time.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              No live table stream connected yet.
            </div>
          </section>

          <section id="economy" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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

          <section id="crypto" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              Crypto gateway
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Approve withdrawals and verify inbound transactions.
            </p>
            <div className="mt-6 grid gap-4 text-xs uppercase tracking-[0.2rem] text-white/60 md:grid-cols-2">
              {['Verify deposit', 'Approve withdrawal', 'Freeze wallet', 'Flag address'].map(
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

          <section id="referrals" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              Referral oversight
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Track referral rewards and spot abuse patterns.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              Referral analytics will appear here once tracking is enabled.
            </div>
          </section>

          <section id="security" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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

          <section id="rng" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              RNG and fairness
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Verify shuffles, view deck snapshots, and confirm game integrity.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              Read-only tools will appear in staging environments.
            </div>
          </section>

          <section id="system" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
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

          <section id="logs" className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
                Logs and audits
              </h2>
              <span className="text-xs uppercase tracking-[0.2rem] text-white/40">
                7d window
              </span>
            </div>
            <p className="mt-2 text-sm text-white/60">
              Track admin actions, security events, and game history.
            </p>
            <div className="mt-6 space-y-3">
              {[
                'Admin login: admin@vlackjack.test',
                'Wallet adjustment queued',
                'Table audit requested',
              ].map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white/70"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
