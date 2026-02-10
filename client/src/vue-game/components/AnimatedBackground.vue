<script setup lang="ts">
import { computed } from 'vue'

const suits = ['spades', 'diamonds', 'clubs', 'hearts']
const NUM_SHAPES = 60
const MIN_SIZE = 20
const MAX_SIZE = 80
const MIN_DURATION = 60
const MAX_DURATION = 120

const shapes = computed(() => {
  const height = typeof window === 'undefined' ? 800 : window.innerHeight
  return Array.from({ length: NUM_SHAPES }, (_, i) => ({
    id: i,
    suit: suits[i % suits.length],
    style: {
      top: `${Math.random() * height}px`,
      width: `${Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE}px`,
      height: `${Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE}px`,
      animationDuration: `${Math.random() * (MAX_DURATION - MIN_DURATION) + MIN_DURATION}s`,
      animationDelay: `${-Math.random() * MAX_DURATION}s`,
    },
  }))
})
</script>

<template>
  <div class="animated-bg">
    <svg v-for="shape in shapes" :key="shape.id" :style="shape.style">
      <use :href="`#suit-${shape.suit}`" />
    </svg>
  </div>
</template>
