<script setup lang="ts">
import { computed } from 'vue'
import type { Player, Hand } from '../game/types'
import AnimatedBackground from './components/AnimatedBackground.vue'
import GameHand from './components/GameHand.vue'
import GameHeader from './components/GameHeader.vue'
import PlayerToolbar from './components/PlayerToolbar.vue'
import SvgSprite from './components/SvgSprite.vue'

defineOptions({ shadow: false })

const props = defineProps<{
  players: Player[]
  activePlayerId?: string | null
  activeHandId?: string | null
  isDealing: boolean
  showDealerHoleCard: boolean
  isMuted: boolean
  canDoubleDown: boolean
  canSplit: boolean
  isActionPending: boolean
  isMyTurn: boolean
  playerBank: number
  onHit?: () => void
  onSplit?: () => void
  onDoubleDown?: () => void
  onStand?: () => void
  onToggleMuted?: () => void
}>()

const orderedPlayers = computed(() => {
  const list = Array.isArray(props.players) ? [...props.players] : []
  return list.sort((a, b) => Number(b.isDealer) - Number(a.isDealer))
})

const activePlayer = computed(() => {
  if (!props.activePlayerId) return null
  return props.players.find((player) => player.userId === props.activePlayerId) ?? null
})

const activeHand = computed(() => {
  if (!activePlayer.value || !props.activeHandId) return null
  return activePlayer.value.hands.find((hand) => hand.id === props.activeHandId) ?? null
})
</script>

<template>
  <div class="game-inner">
    <SvgSprite />
    <AnimatedBackground />
    <GameHeader :is-muted="props.isMuted" :on-toggle-muted="props.onToggleMuted" />
    <main class="game-main">
      <div class="table-mat">
        <section
          v-for="(player, index) in orderedPlayers"
          :key="player.userId || (player.isDealer ? 'dealer' : `player-${index}`)"
          class="player-row"
          :class="{ dealer: player.isDealer }"
        >
          <GameHand
            v-for="hand in player.hands"
            :key="hand.id"
            :hand="hand"
            :player="player"
            :active-hand="activeHand"
            :active-player="activePlayer"
            :show-dealer-hole-card="props.showDealerHoleCard"
          />
        </section>
      </div>
      <PlayerToolbar
        :bank="props.playerBank"
        :can-double-down="props.canDoubleDown"
        :can-split="props.canSplit"
        :is-dealing="props.isDealing"
        :is-action-pending="props.isActionPending"
        :is-my-turn="props.isMyTurn"
        :on-double-down="props.onDoubleDown"
        :on-split="props.onSplit"
        :on-stand="props.onStand"
        :on-hit="props.onHit"
      />
    </main>
  </div>
</template>
