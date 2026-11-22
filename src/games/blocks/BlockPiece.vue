<script setup lang="ts">
import { computed } from 'vue'

import { cellsOf, type Piece } from './logic/engine'
import { shapeSize } from './logic/pieces'
import { blockColor } from './palette'

/**
 * A piece drawn as a small grid of blocks. `cell` is the size of one block in px; the
 * element is exactly `cols × cell` wide and `rows × cell` high.
 */
const props = defineProps<{ piece: Piece; cell: number }>()

const size = computed(() => shapeSize(cellsOf(props.piece)))
</script>

<template>
  <div
    class="block-piece"
    :style="{
      width: `${size.cols * cell}px`,
      height: `${size.rows * cell}px`,
      '--block': blockColor(piece.color),
    }"
    aria-hidden="true"
  >
    <span
      v-for="([r, c], i) in cellsOf(piece)"
      :key="i"
      class="bk-block"
      :style="{ left: `${c * cell}px`, top: `${r * cell}px`, width: `${cell}px`, height: `${cell}px` }"
    />
  </div>
</template>

<style scoped>
.block-piece {
  position: relative;
  pointer-events: none;
}

.block-piece .bk-block {
  position: absolute;
}
</style>

<style>
/*
 * One block (shared by the board and the pieces, hence not scoped). Colour comes from the
 * custom property --block; the bevel gives the blocks depth in both themes.
 */
.bk-block {
  box-sizing: border-box;
  padding: 0;
  border-radius: 18%;
  background:
    linear-gradient(160deg, rgb(255 255 255 / 38%) 0%, rgb(255 255 255 / 0%) 45%),
    linear-gradient(0deg, rgb(0 0 0 / 18%) 0%, rgb(0 0 0 / 0%) 40%),
    var(--block);
  box-shadow:
    inset 0 -3px 0 rgb(0 0 0 / 22%),
    inset 0 2px 0 rgb(255 255 255 / 40%),
    0 1px 2px rgb(0 0 0 / 25%);
  background-clip: padding-box;
  border: 1.5px solid transparent;
}
</style>
