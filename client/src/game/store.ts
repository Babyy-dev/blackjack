import { create } from 'zustand'
import { generateShoe, shuffle } from './cards'
import type { GameState, HandResult, Player } from './types'
import { Hand } from './types'
import { playSound, Sounds } from './sound'

const MINIMUM_BET = 1
const STARTING_BANK = 20
const NUMBER_OF_DECKS = 6
const SHUFFLE_THRESHOLD = 0.25

const createPlayers = (): Player[] => [
  { isDealer: false, bank: STARTING_BANK, hands: [new Hand()] },
  { isDealer: true, bank: 0, hands: [new Hand()] },
]

type GameStore = GameState & {
  resetBank: () => void
  toggleMuted: () => void
  setSoundLoadProgress: (value: number) => void
  playRound: () => Promise<void>
  hit: () => Promise<void>
  split: () => Promise<void>
  doubleDown: () => Promise<void>
  endHand: () => Promise<void>
}

const sleep = (ms: number = 900) => new Promise((resolve) => setTimeout(resolve, ms))

export const useGameStore = create<GameStore>((set, get) => {
  const syncPlayers = () => set((state) => ({ players: [...state.players] }))

  const getDealer = () => {
    const players = get().players
    return players[players.length - 1]
  }

  const dealerHasBlackjack = () => getDealer().hands[0].isBlackjack
  const dealerTotal = () => getDealer().hands[0].total

  const nextPlayer = () => {
    const { activePlayer, players } = get()
    if (!activePlayer || activePlayer.isDealer) return null
    return players[players.indexOf(activePlayer) + 1] ?? null
  }

  const reshuffleIfNeeded = () => {
    const { cardsPlayed, shoe } = get()
    const remainingPercentage = 1 - cardsPlayed / (NUMBER_OF_DECKS * 52)
    if (remainingPercentage > SHUFFLE_THRESHOLD) return
    set({ shoe: shuffle(shoe), cardsPlayed: 0 })
  }

  const drawCard = () => {
    reshuffleIfNeeded()
    const { shoe, cardsPlayed } = get()
    const next = shoe.shift()
    set({ shoe: [...shoe], cardsPlayed: cardsPlayed + 1 })
    return next
  }

  const checkForGameOver = (): boolean => {
    const { players } = get()
    if (players[0].bank < MINIMUM_BET) {
      void playSound(Sounds.GameOver, { isMuted: get().isMuted })
      set({ isGameOver: true })
      return true
    }
    return false
  }

  const placeBet = async (player: Player, hand: Hand, amount: number) => {
    set({ isDealing: true })
    await sleep(0)
    player.bank -= amount
    hand.bet += amount
    syncPlayers()
    void playSound(Sounds.Bet, { isMuted: get().isMuted })
    await sleep()
  }

  const dealRound = async () => {
    for (let i = 0; i < 2; i++) {
      for (const player of get().players) {
        const card = drawCard()
        if (!card) continue
        player.hands[0].cards.push(card)
        syncPlayers()
        void playSound(Sounds.Deal, { isMuted: get().isMuted })
        await sleep(600)
      }
    }
  }

  const revealDealerHoleCard = async () => {
    if (get().showDealerHoleCard) return
    await sleep()
    void playSound(Sounds.Deal, { isMuted: get().isMuted })
    set({ showDealerHoleCard: true })
    await sleep()
  }

  const playSoundForResult = (result: HandResult) => {
    if (result === 'win') {
      void playSound(Sounds.Win, { isMuted: get().isMuted })
    } else if (result === 'push') {
      void playSound(Sounds.Push, { isMuted: get().isMuted })
    } else if (!dealerHasBlackjack()) {
      void playSound(Sounds.Lose, { isMuted: get().isMuted })
    }
  }

  const determineResults = async () => {
    for (const player of get().players) {
      if (player.isDealer) continue
      for (const hand of player.hands) {
        if (hand.result) continue
        if (dealerTotal() > 21) hand.result = 'win'
        else if (dealerTotal() === hand.total) hand.result = 'push'
        else if (dealerTotal() < hand.total) hand.result = 'win'
        else hand.result = 'lose'
        syncPlayers()
        playSoundForResult(hand.result)
        await sleep()
      }
    }
  }

  const settleBets = async () => {
    let total = 0
    for (const player of get().players) {
      if (player.isDealer) continue
      for (const hand of player.hands) {
        if (hand.result === 'win') hand.bet *= 2
        if (['lose', 'bust'].includes(hand.result!)) hand.bet = 0
        total += hand.bet
      }
    }
    syncPlayers()
    void playSound(total > 1 ? Sounds.ChipUp : Sounds.ChipDown, { isMuted: get().isMuted })
    await sleep()
  }

  const collectWinnings = async () => {
    for (const player of get().players) {
      if (player.isDealer) continue
      const total = player.hands.reduce((acc: number, hand: Hand) => acc + hand.bet, 0)
      player.bank += total
      if (total > 0) void playSound(Sounds.Bank, { isMuted: get().isMuted })
      for (const hand of player.hands) hand.bet = 0
    }
    syncPlayers()
    await sleep(300)
  }

  const resetHands = async () => {
    for (const player of get().players) {
      for (const hand of player.hands) {
        get().shoe.push(...hand.cards)
        hand.reset()
      }
    }
    set((state) => ({ shoe: [...state.shoe] }))
    syncPlayers()
    await sleep()
  }

  const checkForBlackjack = async (hand: Hand): Promise<boolean> => {
    if (hand.isBlackjack) {
      hand.result = 'blackjack'
      syncPlayers()
      await sleep(100)
      void playSound(Sounds.BlackjackBoom, { isMuted: get().isMuted })
      await sleep(500)
      void playSound(Sounds.Blackjack, { isMuted: get().isMuted })
      await sleep(1200)
      hand.bet *= 3
      syncPlayers()
      void get().endHand()
      return true
    }
    return false
  }

  const checkForTwentyOne = async (hand: Hand): Promise<boolean> => {
    if (hand.total === 21) {
      if (!get().activePlayer?.isDealer) {
        void playSound(Sounds.GoodHit, { isMuted: get().isMuted })
      }
      await sleep()
      void get().endHand()
      return true
    }
    return false
  }

  const checkForBust = async (hand: Hand): Promise<boolean> => {
    if (hand.isBust) {
      if (!get().activePlayer?.isDealer) {
        void playSound(Sounds.BadHit, { isMuted: get().isMuted })
      }
      await sleep()
      set({ activeHand: null })
      await sleep(300)
      hand.result = 'bust'
      syncPlayers()
      if (!get().activePlayer?.isDealer) {
        void playSound(Sounds.Bust, { isMuted: get().isMuted })
      }
      void get().endHand()
      return true
    }
    return false
  }

  const playHand = async (hand: Hand): Promise<void> => {
    set({ isDealing: true, activeHand: hand })
    if (await checkForBlackjack(hand)) return
    if (hand.cards.length === 1) {
      await get().hit()
      if (hand.cards[0].rank === 'A') {
        void get().endHand()
        return
      }
    }
    set({ isDealing: false })
  }

  const playDealerHand = async (hand: Hand) => {
    set({ isDealing: true, activeHand: hand })
    await revealDealerHoleCard()
    const allPlayersDone = get().players.every(
      (player) => player.isDealer || player.hands.every((target) => !!target.result),
    )
    if (allPlayersDone) return endRound()
    if (dealerTotal() < 17) {
      await get().hit()
      if (!getDealer().hands[0].result) return playDealerHand(hand)
    }
    endRound()
  }

  const playTurn = (player: Player) => {
    set({ activePlayer: player })
    if (player.isDealer) return playDealerHand(player.hands[0])
    void playHand(player.hands[0])
  }

  const endRound = async () => {
    set({ isDealing: true })
    if (!get().showDealerHoleCard) await revealDealerHoleCard()
    if (dealerHasBlackjack()) {
      void playSound(Sounds.DealerBlackjack, { isMuted: get().isMuted })
    }
    set({ activeHand: null, activePlayer: null })
    await determineResults()
    await settleBets()
    await collectWinnings()
    await resetHands()
    void get().playRound()
  }

  return {
    shoe: generateShoe(NUMBER_OF_DECKS),
    cardsPlayed: 0,
    players: createPlayers(),
    activePlayer: null,
    activeHand: null,
    isDealing: true,
    showDealerHoleCard: false,
    isGameOver: false,
    isMuted: typeof window !== 'undefined' && localStorage.getItem('isMuted') === 'true',
    soundLoadProgress: 0,
    resetBank: () => {
      get().players.forEach((player) => {
        if (!player.isDealer) player.bank = STARTING_BANK
      })
      syncPlayers()
    },
    toggleMuted: () => {
      const next = !get().isMuted
      set({ isMuted: next })
      if (typeof window !== 'undefined') {
        localStorage.setItem('isMuted', next.toString())
      }
    },
    setSoundLoadProgress: (value: number) => set({ soundLoadProgress: value }),
    playRound: async () => {
      if (checkForGameOver()) return
      get().players.forEach((player) => {
        player.hands = [new Hand()]
      })
      set({ showDealerHoleCard: false })
      syncPlayers()
      await placeBet(get().players[0], get().players[0].hands[0], MINIMUM_BET)
      await dealRound()
      if (dealerHasBlackjack()) return endRound()
      playTurn(get().players[0])
    },
    hit: async () => {
      set({ isDealing: true })
      const activeHand = get().activeHand
      if (!activeHand) return
      const card = drawCard()
      if (!card) return
      activeHand.cards.push(card)
      syncPlayers()
      void playSound(Sounds.Deal, { isMuted: get().isMuted })
      if (await checkForTwentyOne(activeHand)) return
      if (await checkForBust(activeHand)) return
      await sleep()
      if (!get().activePlayer?.isDealer) set({ isDealing: false })
    },
    split: async () => {
      const { activeHand, activePlayer } = get()
      if (!activeHand || !activePlayer) return
      if (get().isDealing) return
      if (activePlayer.bank < activeHand.bet) return
      if (activeHand.cards.length !== 2) return
      if (activePlayer.hands.length !== 1) return
      if (activeHand.cards[0].rank !== activeHand.cards[1].rank) return

      set({ isDealing: true })
      const bet = activeHand.bet
      const splitHands = [new Hand(bet), new Hand(0)]
      splitHands[0].cards = activeHand.cards.slice(0, 1)
      splitHands[1].cards = activeHand.cards.slice(1)
      set({ activeHand: null })
      await sleep()
      activePlayer.hands = splitHands
      syncPlayers()
      await placeBet(activePlayer, activePlayer.hands[1], bet)
      playTurn(activePlayer)
    },
    doubleDown: async () => {
      const { activeHand, activePlayer } = get()
      if (!activeHand || !activePlayer) return
      if (get().isDealing) return
      if (activePlayer.bank < activeHand.bet) return
      if (activeHand.cards.length !== 2) return
      if (activePlayer.hands.length !== 1) return

      await placeBet(activePlayer, activeHand, activeHand.bet)
      await get().hit()
      void get().endHand()
    },
    endHand: async () => {
      const { activePlayer } = get()
      const isSplit = activePlayer && activePlayer.hands.length > 1
      if (isSplit && activePlayer?.hands[1].cards.length === 1) {
        return playHand(activePlayer.hands[1])
      }
      const next = nextPlayer()
      if (next) playTurn(next)
    },
  }
})
