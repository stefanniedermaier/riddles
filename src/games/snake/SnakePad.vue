<script setup lang="ts">
import { t } from '@/core/i18n'
import type { Direction } from './logic/types'

/**
 * Four large direction buttons below the board – for players who find swiping hard, and
 * the main control of the calm speed. Each press is one turn (calm: one step).
 */
const emit = defineEmits<{ turn: [direction: Direction] }>()

const BUTTONS: { direction: Direction; points: string }[] = [
  { direction: 'up', points: '12,6 19,16 5,16' },
  { direction: 'left', points: '6,12 16,5 16,19' },
  { direction: 'right', points: '18,12 8,5 8,19' },
  { direction: 'down', points: '12,18 5,8 19,8' },
]
</script>

<template>
  <div class="pad" role="group" :aria-label="t('snake.play.pad')">
    <button
      v-for="button in BUTTONS"
      :key="button.direction"
      type="button"
      class="pad__button md-ripple-target"
      :class="`pad__button--${button.direction}`"
      :aria-label="t(`snake.play.${button.direction}`)"
      @pointerdown.prevent="emit('turn', button.direction)"
      @click="$event.detail === 0 && emit('turn', button.direction)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><polygon :points="button.points" /></svg>
    </button>
  </div>
</template>

<style scoped>
.pad {
  display: grid;
  grid-template:
    '. up .' auto
    'left . right' auto
    '. down .' auto / auto auto auto;
  gap: var(--space-1);
  justify-content: center;
  touch-action: manipulation;
}

.pad__button {
  display: grid;
  place-items: center;
  width: 60px;
  height: 52px;
  border: 1px solid color-mix(in srgb, var(--game-snake) 30%, var(--color-border));
  border-radius: 0;
  background: color-mix(in srgb, var(--game-snake) 12%, var(--color-surface));
  color: var(--game-snake);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

.pad__button svg {
  width: 26px;
  height: 26px;
  fill: currentColor;
}

.pad__button--up {
  grid-area: up;
}

.pad__button--left {
  grid-area: left;
}

.pad__button--right {
  grid-area: right;
}

.pad__button--down {
  grid-area: down;
}
</style>
