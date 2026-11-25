<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import CodeBreakerRules from './CodeBreakerRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { CodeSave } from './logic/types'

function savedLabel(saved: CodeSave): string {
  const { difficulty } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${sizeLabel(difficulty)} · ${formatDuration(saved.elapsedMs)}`
}
</script>

<template>
  <PuzzleLobby
    game="codebreaker"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
  >
    <template #rules><CodeBreakerRules /></template>
  </PuzzleLobby>
</template>
