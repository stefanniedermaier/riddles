<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import RulesCard from '@/components/RulesCard.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { getStats, getVariantStats } from '@/core/stats'

import { poolOf } from './generate'
import {
  difficultiesOf,
  isDifficulty,
  isMode,
  statVariant,
  type Difficulty,
  type SudokuMode,
} from './logic/types'
import { sudokuSettings } from './settings'
import SudokuRules from './SudokuRules.vue'
import { loadSavedGame } from './useSudokuGame'

const router = useRouter()

/** Selected grid (remembered between visits). */
const mode = computed<SudokuMode>({
  get: () => (isMode(sudokuSettings.value.lastMode) ? sudokuSettings.value.lastMode : 'classic'),
  set: (value) => {
    sudokuSettings.value.lastMode = value
  },
})
const modeOptions = computed(() => [
  { value: 'classic' as SudokuMode, label: t('sudoku.modes.classic') },
  { value: 'mini' as SudokuMode, label: t('sudoku.modes.mini') },
])

const saved = computed(() => loadSavedGame(mode.value))

/** First-time players see the rules first; afterwards they move below the menu. */
const hasPlayed =
  Object.values(getStats('sudoku')).some((s) => s.started > 0) ||
  loadSavedGame('classic') !== null ||
  loadSavedGame('mini') !== null
const pendingDifficulty = ref<Difficulty | null>(null)
const playQuery = (playMode: SudokuMode) => (playMode === 'mini' ? { mode: 'mini' } : {})

const items = computed(() =>
  difficultiesOf(mode.value).map((difficulty) => {
    const best = getVariantStats('sudoku', statVariant(mode.value, difficulty)).bestTimeMs
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
  void router.push({ name: 'sudoku-play', query: playQuery(mode.value) })
}

function start(difficulty: Difficulty): void {
  void router.push({ name: 'sudoku-play', query: { ...playQuery(mode.value), new: difficulty } })
}

function onSelect(id: string): void {
  if (!isDifficulty(id)) return
  if (saved.value) pendingDifficulty.value = id
  else start(id)
}

function confirmReplace(): void {
  const difficulty = pendingDifficulty.value
  pendingDifficulty.value = null
  if (difficulty) start(difficulty)
}

// Prepare one puzzle per difficulty of the selected grid in the background.
watch(mode, (current) => poolOf(current).warm(difficultiesOf(current)), { immediate: true })
</script>

<template>
  <AppBar :title="t('sudoku.name')" back-to="/">
    <template #actions>
      <GameSettingsButton game="sudoku" />
    </template>
  </AppBar>

  <main class="page">
    <RulesCard v-if="!hasPlayed" class="rules--top" :title="t('sudoku.rules.title')" accent="var(--game-sudoku)">
      <SudokuRules :mode="mode" />
    </RulesCard>

    <SegmentedControl v-model="mode" :options="modeOptions" :label="t('sudoku.modes.label')" />

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

    <RulesCard v-if="hasPlayed" class="rules--bottom" :title="t('sudoku.rules.title')" accent="var(--game-sudoku)">
      <SudokuRules :mode="mode" />
    </RulesCard>
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
.rules--top {
  margin-bottom: var(--space-4);
}

.rules--bottom {
  margin-top: var(--space-5);
}

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
