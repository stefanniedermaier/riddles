<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { SIZE } from './logic/engine'
import { blockColor } from './palette'
import type { Ghost, ClearingBlock } from './boardTypes'

const props = defineProps<{
  board: readonly number[]
  /** Preview of the piece being dragged (only when it fits). */
  ghost?: Ghost | null
  /** Cells of the lines the preview would complete. */
  completing?: ReadonlySet<number> | null
  /** Blocks vanishing right now (animation). */
  clearing?: readonly ClearingBlock[]
  /** Key that restarts the clearing animation. */
  clearKey?: number
  /** Cells just placed (pop-in animation). */
  placed?: ReadonlySet<number> | null
  /** Keyboard cursor. */
  cursor?: number | null
}>()

const emit = defineEmits<{
  /** Tap on a cell (tap-to-place). */
  tap: [cell: number]
  keydown: [event: KeyboardEvent]
}>()

const root = ref<HTMLElement | null>(null)
defineExpose({ root })

const ghostCells = computed(() => new Set(props.ghost?.cells ?? []))
const cells = computed(() => Array.from({ length: SIZE * SIZE }, (_, cell) => cell))

function onPointerUp(event: PointerEvent): void {
  const rect = root.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const col = Math.floor(((event.clientX - rect.left) / rect.width) * SIZE)
  const row = Math.floor(((event.clientY - rect.top) / rect.height) * SIZE)
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return
  emit('tap', row * SIZE + col)
}

const pos = (cell: number) => ({
  left: `${((cell % SIZE) / SIZE) * 100}%`,
  top: `${(Math.floor(cell / SIZE) / SIZE) * 100}%`,
})
</script>

<template>
  <div
    ref="root"
    class="blocks-board no-select"
    role="application"
    tabindex="0"
    :aria-label="t('blocks.play.board')"
    @pointerup="onPointerUp"
    @keydown="emit('keydown', $event)"
  >
    <div
      v-for="cell in cells"
      :key="cell"
      class="slot"
      :class="{
        'slot--completing': completing?.has(cell),
        'slot--cursor': cursor === cell,
      }"
      :style="pos(cell)"
    >
      <span
        v-if="board[cell]"
        class="bk-block slot__block"
        :class="{ 'slot__block--placed': placed?.has(cell) }"
        :style="{ '--block': blockColor(board[cell]!) }"
      />
      <span
        v-else-if="ghostCells.has(cell)"
        class="bk-block slot__block slot__block--ghost"
        :style="{ '--block': blockColor(ghost!.color) }"
      />
    </div>

    <div :key="clearKey" class="clearing" aria-hidden="true">
      <span
        v-for="block in clearing"
        :key="block.cell"
        class="bk-block clearing__block"
        :style="{ ...pos(block.cell), '--block': blockColor(block.color), animationDelay: `${block.delay}ms` }"
      />
    </div>
  </div>
</template>

<style scoped>
.blocks-board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--game-blocks) 16%, var(--color-surface-2));
  box-shadow:
    inset 0 2px 6px rgb(0 0 0 / 18%),
    var(--shadow-sm);
  /* Two-finger zoom stays possible (low vision); one finger never scrolls the page. */
  touch-action: pinch-zoom;
  outline: none;
}

.blocks-board:focus-visible {
  box-shadow: 0 0 0 3px var(--color-accent);
}

.slot {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  padding: 1.5px;
}

/* Empty cells: a soft recessed square. */
.slot::before {
  position: absolute;
  inset: 3px;
  border-radius: 18%;
  background: color-mix(in srgb, var(--color-bg) 55%, transparent);
  content: '';
}

.slot--completing::before {
  background: color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.slot--completing .slot__block {
  filter: brightness(1.25) saturate(1.2);
}

.blocks-board:focus-visible .slot--cursor::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 2px dashed var(--color-text);
  border-radius: 20%;
  content: '';
}

.slot__block {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.slot__block--ghost {
  opacity: 0.45;
}

.slot__block--placed {
  animation: block-in 0.22s var(--ease-out);
}

.clearing {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.clearing__block {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  animation: block-out 0.42s var(--ease-out) both;
}

@keyframes block-in {
  from {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.08);
  }
}

@keyframes block-out {
  0% {
    transform: scale(1);
    filter: brightness(1);
    opacity: 1;
  }
  35% {
    transform: scale(1.15);
    filter: brightness(1.8);
    opacity: 1;
  }
  100% {
    transform: scale(0.2) rotate(30deg);
    opacity: 0;
  }
}

:root[data-motion='reduced'] .slot__block--placed,
:root[data-motion='reduced'] .clearing {
  display: none;
  animation: none;
}

:root[data-motion='reduced'] .slot__block--placed {
  display: block;
}
</style>
