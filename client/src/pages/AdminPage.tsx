import { useQuery } from '@tanstack/react-query'
import { getAdminOverview, getAdminUsers } from '../api/admin'

const AdminPage = () => {
  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: getAdminOverview,
  })
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
  })

  const overview = overviewQuery.data
  const users = usersQuery.data ?? []

  return (
    <div className="mx-auto flex w-full  flex-col gap-10 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">Admin</p>
        <h1 className="text-4xl font-display uppercase tracking-[0.3rem] text-white">
          Control room
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Monitor live activity, manage balances, and keep tables secure.
        </p>
        {overviewQuery.isError && (
          <p className="mt-3 text-xs uppercase tracking-[0.2rem] text-red-200">
            Overview unavailable.
          </p>
        )}
      </header>

      <section className="grid gap-6 md:grid-cols-4">
        {[
          { label: 'Total players', value: overview?.user_count ?? 0 },
          { label: 'Active sessions', value: overview?.active_sessions ?? 0 },
          { label: 'Wallets', value: overview?.wallet_count ?? 0 },
          { label: '24h transactions', value: overview?.recent_transactions ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-xs uppercase tracking-[0.2rem] text-white/60">{card.label}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              User roster
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
                <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2rem]">
                  <span className={user.is_active ? 'text-emerald-300' : 'text-red-200'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={user.is_admin ? 'text-amber-300' : 'text-white/40'}>
                    {user.is_admin ? 'Admin' : 'Player'}
                  </span>
                  <span className="text-white/50">{user.wallet_balance} TOKEN</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
            Admin controls
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Command tools will sync with live tables as we build moderation workflows.
          </p>
          <div className="mt-6 space-y-4 text-xs uppercase tracking-[0.2rem] text-white/60">
            {[
              'Kick player',
              'Mute player',
              'Adjust balance',
              'Pause table',
              'Broadcast alert',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3"
              >
                <span>{item}</span>
                <span className="text-white/30">Queued</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminPage
