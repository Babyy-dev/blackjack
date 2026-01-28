import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useGameStore } from '../store'
import { depositToTable, getWallet } from '../../api/wallet'
import { useAuthStore } from '../../store/authStore'

const PlayerBank = () => {
  const players = useGameStore((state) => state.players)
  const serverMode = useGameStore((state) => state.serverMode)
  const tableId = useGameStore((state) => state.tableId)
  const userId = useAuthStore((state) => state.user?.id)
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const bank = useMemo(() => {
    if (!players.length) return 0
    const seat =
      players.find((player) => player.userId === userId && !player.isDealer) ??
      players.find((player) => !player.isDealer)
    return seat?.bank ?? 0
  }, [players, userId])
  const previous = useRef(bank)
  const [isIncreasing, setIsIncreasing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositReceipt, setDepositReceipt] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['wallet', 'quick'],
    queryFn: getWallet,
    enabled: isOpen && Boolean(accessToken),
  })

  const depositMutation = useMutation({
    mutationFn: depositToTable,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      setDepositAmount('')
      const depositTokens = data.transaction.amount_tokens
      const bank = data.table_bank
      const receipt = `+${depositTokens} TOKEN • Table: ${bank}`
      setDepositReceipt(receipt)
      setStatusMessage('Added to table balance.')
      window.setTimeout(() => setStatusMessage(null), 2000)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Deposit failed.'
      setStatusMessage(message)
      window.setTimeout(() => setStatusMessage(null), 2400)
    },
  })

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  useEffect(() => {
    if (bank > previous.current) {
      setIsIncreasing(true)
      const timeout = window.setTimeout(() => setIsIncreasing(false), 1000)
      previous.current = bank
      return () => window.clearTimeout(timeout)
    }
    previous.current = bank
  }, [bank])

  useEffect(() => {
    if (!isOpen) {
      setStatusMessage(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setDepositReceipt(null)
    }
  }, [isOpen])

  const handleCopy = async (label: string, value: string | null | undefined) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setStatusMessage(`${label} address copied.`)
      window.setTimeout(() => setStatusMessage(null), 2000)
    } catch {
      setStatusMessage('Copy failed.')
    }
  }

  const walletBalance = data?.wallet.balance ?? 0
  const depositValue = Number(depositAmount)
  const canDeposit =
    Boolean(accessToken) &&
    serverMode &&
    !depositMutation.isPending &&
    Number.isFinite(depositValue) &&
    depositValue > 0 &&
    (!data || depositValue <= walletBalance)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`bank bank-button ${isIncreasing ? 'is-increasing' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Open wallet"
      >
        <svg role="img" aria-label="Chips" className={`chip ${isIncreasing ? 'is-spinning' : ''}`}>
          <use href="#chip" />
        </svg>
        <span className="times">&times;</span>
        <span className="number">{bank}</span>
      </button>
      {isOpen && (
        <div
          className="bank-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div className="bank-modal" role="dialog" aria-modal="true" aria-label="Wallet">
            <div className="bank-modal__header">
              <div>
                <p className="bank-modal__eyebrow">Wallet</p>
                <h3 className="bank-modal__title">Token vault</h3>
              </div>
              <button type="button" className="bank-modal__close" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
            {statusMessage && <p className="bank-modal__message">{statusMessage}</p>}
            <div className="bank-modal__balances">
              <div className="bank-modal__balance">
                <span>Table balance</span>
                <strong>{bank} TOKEN</strong>
              </div>
              <div className="bank-modal__balance">
                <span>Wallet balance</span>
                <strong>
                  {accessToken ? (isLoading ? '...' : data?.wallet.balance ?? 0) : 'Sign in'}
                </strong>
              </div>
            </div>
            {!accessToken ? (
              <p className="bank-modal__note">
                Sign in to see your deposit addresses and wallet activity.
              </p>
            ) : (
              <div className="bank-modal__section">
                <p className="bank-modal__label">Deposit addresses</p>
                <div className="bank-modal__address">
                  <div>
                    <p className="bank-modal__address-label">ETH deposit</p>
                    <p className="bank-modal__address-value">
                      {data?.wallet.eth_deposit_address ?? 'Pending setup'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('ETH', data?.wallet.eth_deposit_address)}
                    disabled={!data?.wallet.eth_deposit_address}
                  >
                    Copy
                  </button>
                </div>
                <div className="bank-modal__address">
                  <div>
                    <p className="bank-modal__address-label">SOL deposit</p>
                    <p className="bank-modal__address-value">
                      {data?.wallet.sol_deposit_address ?? 'Pending setup'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('SOL', data?.wallet.sol_deposit_address)}
                    disabled={!data?.wallet.sol_deposit_address}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
            {accessToken && (
              <div className="bank-modal__section">
                <p className="bank-modal__label">Add to table</p>
                {!serverMode ? (
                  <p className="bank-modal__note">
                    Join a multiplayer table to move tokens into your table balance.
                  </p>
                ) : (
                  <div className="bank-modal__deposit">
                    <label>
                      Amount (TOKEN)
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!canDeposit}
                      onClick={() =>
                        depositMutation.mutate({
                          amount_tokens: Math.floor(depositValue),
                          table_id: tableId ?? undefined,
                        })
                      }
                    >
                      Add to table
                    </button>
                    {depositReceipt && (
                      <p className="bank-modal__receipt">{depositReceipt}</p>
                    )}
                    <p className="bank-modal__hint">Available: {walletBalance} TOKEN</p>
                  </div>
                )}
              </div>
            )}
            <div className="bank-modal__actions">
              <Link to="/wallet" onClick={() => setIsOpen(false)}>
                Open wallet
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PlayerBank
