<script setup lang="ts">
/**
 * Star symbol of this game (filled, scales with its container). The outline in the surface
 * colour keeps it readable on every region colour, also when it turns red for a conflict.
 */
defineProps<{ ghost?: boolean }>()
</script>

<template>
  <svg class="star-glyph" :class="{ 'star-glyph--ghost': ghost }" viewBox="0 0 32 32" aria-hidden="true">
    <path
      d="M16.00 3.50 L19.29 12.47 L28.84 12.83 L21.33 18.73 L23.94 27.92 L16.00 22.60 L8.06 27.92 L10.67 18.73 L3.16 12.83 L12.71 12.47Z"
      fill="currentColor"
      stroke="var(--star-outline, var(--color-surface))"
      stroke-width="1.6"
      stroke-linejoin="round"
      paint-order="stroke"
    />
  </svg>
</template>

<style scoped>
.star-glyph {
  display: block;
  width: 78%;
  height: 78%;
}

.star-glyph--ghost {
  opacity: 0.4;
}
</style>
