<script setup lang="ts">
import PlayerBank from './PlayerBank.vue'

const props = defineProps<{
  bank: number
  canDoubleDown: boolean
  canSplit: boolean
  isDealing: boolean
  isActionPending: boolean
  isMyTurn: boolean
  onDoubleDown?: () => void
  onSplit?: () => void
  onStand?: () => void
  onHit?: () => void
}>()
</script>

<template>
  <div class="player-toolbar" role="toolbar">
    <button
      :disabled="!canDoubleDown || !isMyTurn || isActionPending"
      @click="props.onDoubleDown && props.onDoubleDown()"
    >
      Double<br />Down
    </button>
    <button
      :disabled="!canSplit || !isMyTurn || isActionPending"
      @click="props.onSplit && props.onSplit()"
    >
      Split
    </button>
    <PlayerBank :bank="props.bank" />
    <button
      :disabled="isDealing || !isMyTurn || isActionPending"
      @click="props.onStand && props.onStand()"
    >
      Stand
    </button>
    <button
      :disabled="isDealing || !isMyTurn || isActionPending"
      @click="props.onHit && props.onHit()"
    >
      Hit
    </button>
  </div>
</template>
