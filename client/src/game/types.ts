import { CardSuits, CardValue } from './cards'

export type CardSuit = (typeof CardSuits)[number]
export type CardRank = keyof typeof CardValue
export type HandResult = 'win' | 'lose' | 'push' | 'blackjack' | 'bust'

export type Card = {
  rank: CardRank
  suit: CardSuit
  index: number
}

export type Player = {
  userId?: string
  displayName?: string
  name?: string
  isDealer: boolean
  bank: number
  hands: Hand[]
}

export type GameState = {
  shoe: Card[]
  cardsPlayed: number
  players: Player[]
  activePlayer: Player | null
  activeHand: Hand | null
  isDealing: boolean
  showDealerHoleCard: boolean
  isMuted: boolean
  isGameOver: boolean
  soundLoadProgress: number
  status?: string
  minBet?: number
  maxBet?: number
  turnEndsAt?: string | null
}

export class Hand {
  id: string
  cards: Card[]
  bet: number
  result?: HandResult
  status?: string

  constructor(bet = 0, id?: string) {
    this.id = id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.cards = []
    this.bet = bet
  }

  get total(): number {
    let total = 0
    let addedHighAce = false
    for (const card of this.cards) {
      total += CardValue[card.rank as CardRank]
      if (card.rank === 'A' && !addedHighAce) {
        total += 10
        addedHighAce = true
      }
    }
    if (total > 21 && addedHighAce) total -= 10
    return total
  }

  get isBust(): boolean {
    return this.total > 21
  }

  get isBlackjack(): boolean {
    return this.total === 21 && this.cards.length === 2
  }

  reset() {
    this.cards = []
    this.bet = 0
    this.result = undefined
    this.status = undefined
  }

  static fromPayload(payload: {
    id: string
    cards: Card[]
    bet: number
    result?: HandResult
    status?: string
  }): Hand {
    const hand = new Hand(payload.bet, payload.id)
    hand.cards = payload.cards
    hand.result = payload.result
    hand.status = payload.status
    return hand
  }
}
