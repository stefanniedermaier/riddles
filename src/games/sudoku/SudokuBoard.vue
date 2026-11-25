<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/core/i18n'
import { digitsOf, geometryOfCells } from './logic/board'

const props = defineProps<{
  givens: readonly number[]
  values: readonly number[]
  notes: readonly number[]
  selected: number | null
  highlightPeers: boolean
  highlightSameDigits: boolean
  focusCells?: readonly number[]
  targetCell?: number | null
  wrongCells?: readonly number[]
}>()

const emit = defineEmits<{ select: [cell: number] }>()

/** Geometry (9×9 or 6×6) derived from the number of cells. */
const geo = computed(() => geometryOfCells(props.values.length))
const rowOf = (cell: number): number => geo.value.rowOf[cell]!
const colOf = (cell: number): number => geo.value.colOf[cell]!
const boxOf = (cell: number): number => geo.value.boxOf[cell]!

const selectedDigit = computed(() =>
  props.selected === null ? 0 : (props.values[props.selected] ?? 0),
)

const focusSet = computed(() => new Set(props.focusCells ?? []))
const wrongSet = computed(() => new Set(props.wrongCells ?? []))

function isPeer(cell: number): boolean {
  const s = props.selected
  if (s === null || s === cell) return false
  return rowOf(s) === rowOf(cell) || colOf(s) === colOf(cell) || boxOf(s) === boxOf(cell)
}

function cellClasses(cell: number) {
  const value = props.values[cell]!
  const row = rowOf(cell)
  const col = colOf(cell)
  const { size, boxRows, boxCols } = geo.value
  return {
    'cell--given': props.givens[cell] !== 0,
    'cell--entry': props.givens[cell] === 0 && value !== 0,
    'cell--selected': props.selected === cell,
    'cell--peer': props.highlightPeers && isPeer(cell),
    'cell--same': props.highlightSameDigits && selectedDigit.value !== 0 && value === selectedDigit.value,
    'cell--focus': focusSet.value.has(cell),
    'cell--target': props.targetCell === cell,
    'cell--wrong': wrongSet.value.has(cell),
    'cell--box-right': col < size - 1 && (col + 1) % boxCols === 0,
    'cell--box-bottom': row < size - 1 && (row + 1) % boxRows === 0,
    'cell--last-col': col === size - 1,
    'cell--last-row': row === size - 1,
  }
}

function cellLabel(cell: number): string {
  const position = t('sudoku.play.cellLabel', { row: rowOf(cell) + 1, col: colOf(cell) + 1 })
  const value = props.values[cell]!
  let content: string
  if (props.givens[cell] !== 0) content = t('sudoku.play.cellGiven', { digit: value })
  else if (value !== 0) content = t('sudoku.play.cellValue', { digit: value })
  else if (props.notes[cell]) content = t('sudoku.play.cellNotes', { digits: digitsOf(props.notes[cell]).join(' ') })
  else content = t('sudoku.play.cellEmpty')
  return `${position}: ${content}`
}

function noteHighlighted(cell: number, digit: number): boolean {
  return (
    props.highlightSameDigits &&
    selectedDigit.value === digit &&
    props.values[cell] === 0 &&
    (props.notes[cell]! & (1 << digit)) !== 0
  )
}
</script>

<template>
  <div
    class="board no-select"
    :class="{ 'board--mini': geo.size === 6 }"
    :style="{ '--n': geo.size }"
    role="group"
    :aria-label="t('sudoku.name')"
  >
    <button
      v-for="(value, cell) in values"
      :key="cell"
      type="button"
      class="cell"
      :class="cellClasses(cell)"
      :aria-label="cellLabel(cell)"
      :aria-pressed="selected === cell"
      @pointerdown.prevent="emit('select', cell)"
      @keydown.enter.prevent="emit('select', cell)"
    >
      <span v-if="value !== 0" class="cell__value">{{ value }}</span>
      <span v-else-if="notes[cell]" class="cell__notes" aria-hidden="true">
        <span
          v-for="digit in geo.digits"
          :key="digit"
          class="cell__note"
          :class="{ 'cell__note--hl': noteHighlighted(cell, digit) }"
        >
          {{ notes[cell]! & (1 << digit) ? digit : '' }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.board {
  /* Cell font sizes scale with the board width (cqi units). */
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  grid-template-rows: repeat(var(--n), minmax(0, 1fr));
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  touch-action: manipulation;
}

.cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 6.2cqi;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--dur-fast);
}

.cell--last-col {
  border-right: 0;
}

.cell--last-row {
  border-bottom: 0;
}

.board--mini .cell {
  font-size: 9cqi;
}

.cell--box-right {
  border-right: 2px solid var(--color-border-strong);
}

.cell--box-bottom {
  border-bottom: 2px solid var(--color-border-strong);
}

.cell:focus-visible {
  z-index: 1;
  outline-offset: -3px;
}

.cell--peer {
  background: color-mix(in srgb, var(--game-sudoku) 9%, var(--color-surface));
}

.cell--same {
  background: color-mix(in srgb, var(--game-sudoku) 26%, var(--color-surface));
}

.cell--focus {
  background: color-mix(in srgb, var(--color-warning) 26%, var(--color-surface));
}

.cell--target {
  background: color-mix(in srgb, var(--color-success) 32%, var(--color-surface));
  box-shadow: inset 0 0 0 2px var(--color-success);
}

.cell--wrong {
  background: var(--color-error-soft);
  box-shadow: inset 0 0 0 2px var(--color-error);
}

.cell--selected {
  background: color-mix(in srgb, var(--game-sudoku) 42%, var(--color-surface));
}

.cell--given .cell__value {
  font-weight: 700;
}

.cell--entry .cell__value {
  color: var(--game-sudoku);
  font-weight: 600;
}

.cell--wrong .cell__value {
  color: var(--color-error);
}

.cell__notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  width: 100%;
  height: 100%;
  padding: 1px;
}

.cell__note {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 2.5cqi;
  font-weight: 600;
  line-height: 1;
}

.board--mini .cell__notes {
  grid-template-rows: repeat(2, minmax(0, 1fr));
  padding: 2px 3px;
}

.board--mini .cell__note {
  font-size: 3.6cqi;
}

.cell__note--hl {
  border-radius: 3px;
  background: color-mix(in srgb, var(--game-sudoku) 30%, transparent);
  color: var(--color-text);
}
</style>
