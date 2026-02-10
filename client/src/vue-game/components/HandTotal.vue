<script setup lang="ts">
import { computed } from 'vue'
import type { Hand } from '../../game/types'

const props = defineProps<{ hand: Hand; isDealer: boolean; showDealerHoleCard: boolean }>()

const total = computed(() => {
  if (props.hand.cards.length === 0) return null
  if (props.isDealer && !props.showDealerHoleCard) return null
  return props.hand.total
})
</script>

<template>
  <p v-if="total !== null" class="hand-total" :class="{ bust: total > 21, 'twenty-one': total === 21 }">
    <span class="sr-only">Total:</span>
    {{ total }}
  </p>
</template>
