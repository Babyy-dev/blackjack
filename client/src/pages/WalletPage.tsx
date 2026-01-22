import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { getWallet, getWithdrawals, linkWallet, requestWithdrawal } from '../api/wallet'

const WalletPage = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet'],
    queryFn: getWallet,
    enabled: Boolean(accessToken),
  })
  const withdrawalsQuery = useQuery({
    queryKey: ['wallet', 'withdrawals'],
    queryFn: getWithdrawals,
    enabled: Boolean(accessToken),
  })
  const linkMutation = useMutation({
    mutationFn: linkWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
  const withdrawMutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'withdrawals'] })
    },
  })
  const [walletMessage, setWalletMessage] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [solAddress, setSolAddress] = useState<string | null>(null)
  const [withdrawChain, setWithdrawChain] = useState<'ETH' | 'SOL'>('ETH')
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const isBusy = isConnecting || linkMutation.isPending || withdrawMutation.isPending

  useEffect(() => {
    setEthAddress(data?.wallet.eth_address ?? null)
    setSolAddress(data?.wallet.sol_address ?? null)
  }, [data?.wallet.eth_address, data?.wallet.sol_address])

  useEffect(() => {
    if (linkMutation.isError) {
      setWalletMessage('Wallet link failed. Please try again.')
    }
    if (withdrawMutation.isError) {
      setWalletMessage('Withdrawal request failed. Check balance and address.')
    }
  }, [linkMutation.isError, withdrawMutation.isError])

  useEffect(() => {
    if (withdrawChain === 'ETH') {
      setWithdrawAddress(data?.wallet.eth_address ?? '')
    } else {
      setWithdrawAddress(data?.wallet.sol_address ?? '')
    }
  }, [withdrawChain, data?.wallet.eth_address, data?.wallet.sol_address])

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
    <div className="mx-auto flex w-full flex-col gap-8 px-6 py-10 sm:py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.3rem] text-amber-300/70">Wallet</p>
        <h1 className="text-2xl font-display uppercase tracking-[0.25rem] text-white sm:text-3xl sm:tracking-[0.3rem]">
          Token vault
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Manage deposits, withdrawals, and your in-game token balance.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Balance</p>
          <p className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
            {isLoading ? '...' : data?.wallet.balance ?? 0}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2rem] text-amber-200/80">
            {data?.wallet.currency ?? 'TOKEN'}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#08161c] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Deposit</p>
          <p className="mt-3 text-sm text-white/70">
            Send crypto to your personal deposit address. Tokens are credited after
            confirmation.
          </p>
          <div className="mt-4 space-y-3 text-xs uppercase tracking-[0.2rem] text-white/50">
            <div className="rounded-2xl border border-white/10 bg-[#0d1f27] px-3 py-3">
              <p className="text-[0.6rem] text-white/40">ETH deposit address</p>
              <p className="mt-2 break-all text-white/70">
                {data?.wallet.eth_deposit_address ?? 'Pending setup'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1f27] px-3 py-3">
              <p className="text-[0.6rem] text-white/40">SOL deposit address</p>
              <p className="mt-2 break-all text-white/70">
                {data?.wallet.sol_deposit_address ?? 'Pending setup'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#08161c] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2rem] text-white/60">Withdraw</p>
          <p className="mt-3 text-sm text-white/70">
            Submit a withdrawal request to your linked wallet.
          </p>
          <div className="mt-4 space-y-3 text-xs uppercase tracking-[0.2rem] text-white/60">
            <label className="block">
              Chain
              <select
                value={withdrawChain}
                onChange={(event) =>
                  setWithdrawChain(event.target.value as 'ETH' | 'SOL')
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1f27] px-3 py-2 text-xs text-white"
              >
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </select>
            </label>
            <label className="block">
              Amount (TOKEN)
              <input
                type="number"
                value={withdrawAmount}
                min={1}
                onChange={(event) => setWithdrawAmount(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1f27] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block">
              Destination address
              <input
                type="text"
                value={withdrawAddress}
                onChange={(event) => setWithdrawAddress(event.target.value)}
                placeholder="Paste address"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1f27] px-3 py-2 text-xs text-white"
              />
            </label>
            <button
              onClick={() =>
                withdrawAmount > 0 &&
                withdrawMutation.mutate({
                  chain: withdrawChain,
                  amount_tokens: withdrawAmount,
                  address: withdrawAddress || undefined,
                })
              }
              disabled={isBusy || withdrawAmount <= 0}
              className="w-full rounded-full border border-amber-300/60 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25rem] text-amber-200 transition hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
            >
              Request withdrawal
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
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
                <p className="break-all text-[0.6rem] uppercase tracking-[0.18rem] text-white/40 sm:text-xs sm:tracking-[0.2rem]">
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
                <p className="break-all text-[0.6rem] uppercase tracking-[0.18rem] text-white/40 sm:text-xs sm:tracking-[0.2rem]">
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

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
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

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
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
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2rem] text-white/50">
              Withdrawal requests
            </p>
            <div className="mt-3 space-y-3">
              {withdrawalsQuery.isLoading && (
                <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
                  Loading withdrawals...
                </div>
              )}
              {!withdrawalsQuery.isLoading &&
                (withdrawalsQuery.data?.length ?? 0) === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-4 text-sm text-white/60">
                    No withdrawals yet.
                  </div>
                )}
              {withdrawalsQuery.data?.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-2xl border border-white/10 bg-[#08161c] px-4 py-3 text-sm text-white/70"
                >
                  <p className="text-sm font-semibold text-white">
                    {withdrawal.chain} • {withdrawal.amount_tokens} TOKEN
                  </p>
                  <p className="text-xs uppercase tracking-[0.2rem] text-white/40">
                    {withdrawal.status}
                  </p>
                  {withdrawal.tx_hash && (
                    <p className="mt-2 break-all text-[0.6rem] text-white/30">
                      {withdrawal.tx_hash}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default WalletPage
