<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/core/i18n'

const props = defineProps<{
  /** counts[d] = how often digit d is on the board. */
  counts: readonly number[]
  notesMode: boolean
  /** Grid size: 9 (classic) or 6 (mini) – digits 1…size. */
  size?: number
}>()

const emit = defineEmits<{ input: [digit: number] }>()

const digits = computed(() => Array.from({ length: props.size ?? 9 }, (_, i) => i + 1))

const remaining = (digit: number): number => Math.max(0, (props.size ?? 9) - (props.counts[digit] ?? 0))
</script>

<template>
  <div class="pad" :class="{ 'pad--notes': notesMode }" :style="{ '--n': digits.length }">
    <button
      v-for="digit in digits"
      :key="digit"
      type="button"
      class="pad__key"
      :disabled="remaining(digit) === 0"
      :aria-label="`${digit} – ${t('sudoku.play.remaining', { count: remaining(digit) })}`"
      @click="emit('input', digit)"
    >
      <span class="pad__digit">{{ digit }}</span>
      <span class="pad__count tabular" aria-hidden="true">{{ remaining(digit) }}</span>
    </button>
  </div>
</template>

<style scoped>
.pad {
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: 4px;
  width: 100%;
}

.pad__key {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 58px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--game-sudoku);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

.pad__key:active:not(:disabled) {
  transform: scale(0.93);
}

.pad__key:disabled {
  opacity: 0.3;
  cursor: default;
}

.pad__digit {
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.1;
}

.pad__count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.pad--notes .pad__key {
  background: var(--color-surface-2);
}

.pad--notes .pad__digit {
  font-size: 1.15rem;
  color: var(--color-text-muted);
}
</style>
