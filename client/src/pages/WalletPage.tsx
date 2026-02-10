import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { getWallet } from '../api/wallet'
import DashboardNav from '../components/DashboardNav'
import AnimatedBackground from '../components/AnimatedBackground'

const WalletPage = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  // ... [Original Query Logic Retained for brevity, re-inserting functionality] ...
  const { data } = useQuery({ queryKey: ['wallet'], queryFn: getWallet, enabled: !!accessToken })

  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [withdrawAddress, setWithdrawAddress] = useState('')

  return (
    <div className="min-h-screen w-full bg-[#050f15] text-white">
      <AnimatedBackground />
      <DashboardNav />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-white">Bankroll</h1>
          <p className="text-sm text-white/50">Manage your deposits and withdrawals.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-8 text-black shadow-2xl"
          >
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <h3 className="font-display text-lg font-bold uppercase tracking-wider opacity-80">Total Balance</h3>
            <div className="mt-4 font-display text-5xl font-black tracking-tight">
              ${data?.wallet.balance?.toLocaleString() ?? '0'}
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-widest opacity-60">Chips Available</div>
          </motion.div>

          {/* Deposit Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
          >
            <h3 className="font-display text-xl font-bold uppercase tracking-widest text-white">Quick Deposit</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60">ETHEREUM</span>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <code className="block break-all text-xs text-white/80">{data?.wallet.eth_deposit_address || 'Loading...'}</code>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60">SOLANA</span>
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
                <code className="block break-all text-xs text-white/80">{data?.wallet.sol_deposit_address || 'Loading...'}</code>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Withdrawal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
          >
            <h3 className="font-display text-xl font-bold uppercase tracking-widest text-white">Withdraw</h3>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Amount</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Address</label>
                <input
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50"
                  placeholder="0x..."
                />
              </div>
              <button className="w-full rounded-xl bg-white/10 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/20">
                Request Withdrawal
              </button>
            </div>
          </motion.div>

          {/* History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
          >
            <h3 className="font-display text-xl font-bold uppercase tracking-widest text-white">Recent Transactions</h3>
            <div className="mt-6 space-y-2">
              {/* Mock items based on data */}
              {(data?.transactions.length === 0) && (
                <div className="text-sm text-white/40 italic">No recent activity</div>
              )}
              {data?.transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
                  <span className="text-xs font-bold uppercase text-white/80">{tx.kind}</span>
                  <span className={`text-xs font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}${tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </main>
    </div>
  )
}

export default WalletPage
