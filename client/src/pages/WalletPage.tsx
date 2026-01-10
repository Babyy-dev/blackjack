import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { getWallet, linkWallet } from '../api/wallet'

const WalletPage = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet'],
    queryFn: getWallet,
    enabled: Boolean(accessToken),
  })
  const linkMutation = useMutation({
    mutationFn: linkWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
  const [walletMessage, setWalletMessage] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [solAddress, setSolAddress] = useState<string | null>(null)
  const isBusy = isConnecting || linkMutation.isPending

  useEffect(() => {
    setEthAddress(data?.wallet.eth_address ?? null)
    setSolAddress(data?.wallet.sol_address ?? null)
  }, [data?.wallet.eth_address, data?.wallet.sol_address])

  useEffect(() => {
    if (linkMutation.isError) {
      setWalletMessage('Wallet link failed. Please try again.')
    }
  }, [linkMutation.isError])

  const connectMetaMask = async () => {
    setWalletMessage(null)
    if (!window.ethereum) {
      setWalletMessage('MetaMask not detected. Install the browser extension first.')
      return
    }
    setIsConnecting(true)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const nextAddress = accounts?.[0] ?? null
      setEthAddress(nextAddress)
      if (nextAddress) {
        linkMutation.mutate({ eth_address: nextAddress })
      }
    } catch (err) {
      setWalletMessage(err instanceof Error ? err.message : 'MetaMask connection failed.')
    } finally {
      setIsConnecting(false)
    }
  }

  const connectPhantom = async () => {
    setWalletMessage(null)
    if (!window.solana || !window.solana.isPhantom) {
      setWalletMessage('Phantom wallet not detected. Install the Phantom extension.')
      return
    }
    setIsConnecting(true)
    try {
      const response = await window.solana.connect()
      const nextAddress = response.publicKey.toString()
      setSolAddress(nextAddress)
      if (nextAddress) {
        linkMutation.mutate({ sol_address: nextAddress })
      }
    } catch (err) {
      setWalletMessage(err instanceof Error ? err.message : 'Phantom connection failed.')
    } finally {
      setIsConnecting(false)
    }
  }

  const canPurchase = Boolean(ethAddress || solAddress)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">Wallet</p>
        <h1 className="text-3xl font-display uppercase tracking-[0.3rem] text-white">
          Token vault
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Manage deposits, withdrawals, and your in-game token balance.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Balance</p>
          <p className="mt-4 text-3xl font-semibold text-white">
            {isLoading ? '...' : data?.wallet.balance ?? 0}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-amber-200/80">
            {data?.wallet.currency ?? 'TOKEN'}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#08161c] p-6">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Deposit</p>
          <p className="mt-3 text-sm text-white/70">
            Link a wallet to convert crypto to in-game tokens.
          </p>
          <button
            className="mt-4 w-full rounded-full border border-white/20 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
            disabled
          >
            Coming soon
          </button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#08161c] p-6">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Withdraw</p>
          <p className="mt-3 text-sm text-white/70">
            Request a payout once withdrawal approvals go live.
          </p>
          <button
            className="mt-4 w-full rounded-full border border-white/20 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-white/70"
            disabled
          >
            Coming soon
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
              Wallet connections
            </h2>
            {walletMessage && (
              <span className="text-xs uppercase tracking-[0.2rem] text-red-200">
                {walletMessage}
              </span>
            )}
          </div>
          <div className="mt-6 space-y-4 text-sm text-white/70">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">MetaMask</p>
                <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                  {ethAddress ? `Connected: ${ethAddress}` : 'Not connected'}
                </p>
              </div>
              <button
                onClick={connectMetaMask}
                disabled={isBusy}
                className="rounded-full border border-amber-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
              >
                {ethAddress ? 'Reconnect' : 'Connect'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Phantom</p>
                <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                  {solAddress ? `Connected: ${solAddress}` : 'Not connected'}
                </p>
              </div>
              <button
                onClick={connectPhantom}
                disabled={isBusy}
                className="rounded-full border border-amber-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
              >
                {solAddress ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
            Diamond shop
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Purchase diamonds with your connected wallet. Diamonds unlock premium table skins and
            VIP perks.
          </p>
          <button
            disabled={!canPurchase}
            className="mt-6 w-full rounded-full bg-amber-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25rem] text-[#1b1200] transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40 disabled:hover:translate-y-0"
          >
            {canPurchase ? 'Buy diamonds' : 'Connect a wallet to buy'}
          </button>
          <p className="mt-3 text-xs uppercase tracking-[0.2rem] text-white/40">
            Transactions are queued until on-chain verification is enabled.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display uppercase tracking-[0.2rem] text-white">
            Recent activity
          </h2>
          {error && <span className="text-xs uppercase text-red-200">Unavailable</span>}
        </div>
        <div className="mt-6 space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              Loading wallet activity...
            </div>
          )}
          {!isLoading && data?.transactions.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
              No transactions yet.
            </div>
          )}
          {data?.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white/70"
            >
              <div>
                <p className="text-sm font-semibold text-white">{transaction.kind}</p>
                <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                  {transaction.status}
                </p>
              </div>
              <span className="text-sm text-amber-200">
                {transaction.amount > 0 ? '+' : ''}
                {transaction.amount}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default WalletPage
