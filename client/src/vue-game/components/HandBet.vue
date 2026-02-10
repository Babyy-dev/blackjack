<script setup lang="ts">
import { computed } from 'vue'
import type { Hand } from '../../game/types'

const props = defineProps<{ hand: Hand }>()
const chipCount = computed(() => Math.min(props.hand.bet, 10))
const isLoss = computed(() => ['lose', 'bust'].includes(props.hand.result ?? ''))
const isWin = computed(() => ['push', 'win', 'blackjack'].includes(props.hand.result ?? ''))
</script>

<template>
  <div class="hand-bet" :class="{ 'is-win': isWin, 'is-loss': isLoss }">
    <svg v-for="i in chipCount" :key="i" class="chip">
      <use href="#chip" />
    </svg>
  </div>
</template>
