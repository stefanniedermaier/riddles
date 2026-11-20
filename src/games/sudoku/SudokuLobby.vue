<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'

import { sudokuPool } from './generate'
import { DIFFICULTIES, isDifficulty, type Difficulty } from './logic/types'
import { loadSavedGame } from './useSudokuGame'

const router = useRouter()
const saved = loadSavedGame()
const pendingDifficulty = ref<Difficulty | null>(null)

const items = computed(() =>
  DIFFICULTIES.map((difficulty) => {
    const best = getVariantStats('sudoku', difficulty).bestTimeMs
    return {
      id: difficulty,
      label: t(`difficulty.${difficulty}`),
      detail:
        best !== undefined
          ? t('sudoku.lobby.best', { time: formatDuration(best) })
          : t('sudoku.lobby.noBest'),
    }
  }),
)

function continueGame(): void {
  void router.push({ name: 'sudoku-play' })
}

function start(difficulty: Difficulty): void {
  void router.push({ name: 'sudoku-play', query: { new: difficulty } })
}

function onSelect(id: string): void {
  if (!isDifficulty(id)) return
  if (saved) pendingDifficulty.value = id
  else start(id)
}

function confirmReplace(): void {
  const difficulty = pendingDifficulty.value
  pendingDifficulty.value = null
  if (difficulty) start(difficulty)
}

// Prepare one puzzle per difficulty in the background so starting is instant.
onMounted(() => sudokuPool.warm(DIFFICULTIES))
</script>

<template>
  <AppBar :title="t('sudoku.name')" back-to="/" />

  <main class="page">
    <button v-if="saved" type="button" class="continue" @click="continueGame">
      <span class="continue__text">
        <span class="continue__label">{{ t('common.continue') }}</span>
        <span class="continue__detail tabular">
          {{
            t('sudoku.lobby.continueDetail', {
              difficulty: t(`difficulty.${saved.puzzle.difficulty}`),
              time: formatDuration(saved.elapsedMs),
            })
          }}
        </span>
      </span>
      <AppIcon name="play" />
    </button>

    <h2 class="section-title">{{ t('sudoku.lobby.newGame') }}</h2>
    <ChoiceList :items="items" @select="onSelect" />
  </main>

  <ConfirmDialog
    :open="pendingDifficulty !== null"
    :title="t('sudoku.lobby.replaceTitle')"
    :message="t('sudoku.lobby.replaceConfirm')"
    :confirm-label="t('common.newGame')"
    @confirm="confirmReplace"
    @cancel="pendingDifficulty = null"
  />
</template>

<style scoped>
.continue {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 72px;
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--game-sudoku);
  color: #fff;
  text-align: left;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

:root[data-theme='dark'] .continue {
  color: var(--color-bg);
}

.continue:active {
  transform: scale(0.985);
}

.continue__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.continue__label {
  font-size: var(--text-lg);
  font-weight: 800;
}

.continue__detail {
  font-size: var(--text-sm);
  opacity: 0.9;
}
</style>
