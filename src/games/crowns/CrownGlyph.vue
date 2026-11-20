<script setup lang="ts">
/** Crown symbol drawn for this game (filled, scales with its container). */
defineProps<{ ghost?: boolean }>()
</script>

<template>
  <svg class="crown-glyph" :class="{ 'crown-glyph--ghost': ghost }" viewBox="0 0 32 32" aria-hidden="true">
    <path
      d="M6 23.5 4 10.5l6.6 5.2L16 7l5.4 8.7 6.6-5.2-2 13z"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <rect x="6" y="25" width="20" height="3.2" rx="1.2" fill="currentColor" />
    <circle cx="16" cy="18.5" r="2" class="crown-glyph__gem" />
  </svg>
</template>

<style scoped>
.crown-glyph {
  display: block;
  width: 72%;
  height: 72%;
}

.crown-glyph__gem {
  fill: var(--crown-gem, transparent);
}

.crown-glyph--ghost {
  opacity: 0.4;
}
</style>
