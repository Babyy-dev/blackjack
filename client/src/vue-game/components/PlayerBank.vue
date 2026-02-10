<script setup lang="ts">
const props = defineProps<{ bank: number }>()
</script>

<template>
  <span role="status" class="bank">
    <svg role="img" aria-label="Chips" class="chip">
      <use href="#chip" />
    </svg>
    <span class="times">&times;</span>
    <span class="number">{{ props.bank }}</span>
  </span>
</template>
