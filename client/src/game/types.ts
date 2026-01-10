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
}

export class Hand {
  id: number
  cards: Card[]
  bet: number
  result?: HandResult

  constructor(bet = 0) {
    this.id = new Date().getTime() + Math.random()
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
  }
}
