<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '../../game/types'

const FACE_NAMES: Record<string, string> = {
  A: 'Ace',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
}

const SUIT_NAMES: Record<string, string> = {
  spades: 'Spades',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  hearts: 'Hearts',
}

const props = defineProps<{ card: Card; isFaceDown?: boolean }>()

const symbolCount = computed(() => {
  const rankValue = String(props.card.rank)
  if (['J', 'Q', 'K', 'A', 'a'].includes(rankValue)) return 1
  const numeric = Number(rankValue)
  return Number.isFinite(numeric) ? numeric : 1
})

const cardLabel = computed(() => {
  if (props.isFaceDown) return 'Face-down card'
  const rankKey = String(props.card.rank)
  const rank = FACE_NAMES[rankKey] ?? rankKey
  const suit = SUIT_NAMES[props.card.suit] ?? String(props.card.suit)
  return `${rank} of ${suit}`
})
</script>

<template>
  <div
    class="card deal transition-all duration-500 ease-out"
    :class="{ 'face-down': isFaceDown }"
    :data-rank="isFaceDown ? undefined : String(card.rank).toLowerCase()"
    :data-suit="isFaceDown ? undefined : card.suit"
    role="img"
    :aria-label="cardLabel"
  >
    <div class="card-face shadow-xl ring-1 ring-black/5" role="presentation">
      <template v-if="!isFaceDown">
        <div class="card-corner">
          <span class="card-rank font-display">{{ String(card.rank).toUpperCase() }}</span>
          <svg>
            <use :href="`#suit-${card.suit}`" />
          </svg>
        </div>
        <div class="card-center">
          <svg v-for="i in symbolCount" :key="i" class="drop-shadow-sm">
            <use :href="`#suit-${card.suit}`" />
          </svg>
        </div>
        <div class="card-corner">
          <span class="card-rank font-display">{{ String(card.rank).toUpperCase() }}</span>
          <svg class="card-suit">
            <use :href="`#suit-${card.suit}`" />
          </svg>
        </div>
      </template>
    </div>
    <div class="card-back shadow-xl ring-1 ring-white/10" role="presentation">
      <svg class="opacity-60">
        <use href="#flourish" />
      </svg>
    </div>
  </div>
</template>

