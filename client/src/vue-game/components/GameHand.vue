<script setup lang="ts">
import { computed } from 'vue'
import type { Card, Hand, Player } from '../../game/types'
import HandTotal from './HandTotal.vue'
import HandBet from './HandBet.vue'
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{
  hand: Hand
  player: Player
  activeHand: Hand | null
  activePlayer: Player | null
  showDealerHoleCard: boolean
}>()

const isActiveHand = computed(() => props.activeHand === props.hand && !props.player.isDealer)
const isSplitHand = computed(
  () => props.activePlayer === props.player && !!props.activeHand && props.player.hands.length > 1,
)
const isDealer = computed(() => props.player.isDealer)

const isFaceDown = (cardIndex: number) =>
  isDealer.value && cardIndex === 1 && !props.showDealerHoleCard

const isSplitCard = (card: Card) => {
  if (props.player.hands.indexOf(props.hand) !== 1) return false
  return props.hand.cards.indexOf(card) === 0
}
</script>

<template>
  <article class="hand" :class="{ 'active-hand': isActiveHand, 'split-hand': isSplitHand }">
    <TransitionGroup name="deal-card" tag="div" class="hand-cards">
      <PlayingCard
        v-for="(card, index) in hand.cards"
        :key="`${hand.id}-${card.index}`"
        :card="card"
        :is-face-down="isFaceDown(index)"
        :class="{ 'split-card': isSplitCard(card) }"
        :style="{ '--index': index }"
      />
    </TransitionGroup>
    <HandBet :hand="hand" />
    <div v-if="!player.isDealer" class="hand-result">
      <svg v-if="hand.result" :class="{ blackjack: hand.result === 'blackjack' }">
        <use :href="`#result-${hand.result}`" />
      </svg>
    </div>
    <HandTotal :hand="hand" :is-dealer="player.isDealer" :show-dealer-hole-card="showDealerHoleCard" />
  </article>
</template>
