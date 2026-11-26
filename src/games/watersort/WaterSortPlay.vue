<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { randomSeed } from '@/core/rng'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import { generatePuzzle } from './logic/generator'
import { isComplete, isSolved, pour, unpour } from './logic/rules'
import { solve } from './logic/solver'
import { type WaterSortPuzzle, type WaterSortSave } from './logic/types'
import WaterSortBoard from './WaterSortBoard.vue'
import type { Pour } from './boardTypes'
import WaterSortRules from './WaterSortRules.vue'
import { waterSortSettings } from './settings'
import type { PlayRouteProps } from '../routes'

const selected = ref<number | null>(null)
const hint = ref<{ from: number; to: number } | null>(null)
/**
 * The rest of the solution the last hint came from. Following hints walks along it, so hints
 * always lead to the goal; any other move drops it.
 */
let hintPlan: { from: number; to: number }[] = []
const poured = ref<Pour | null>(null)
const refused = ref<{ tube: number; key: number } | null>(null)
let animationKey = 0

function fresh(puzzle: WaterSortPuzzle): WaterSortSave {
  return { puzzle, tubes: puzzle.tubes.map((tube) => [...tube]), history: [], moves: 0, elapsedMs: 0, hintsUsed: 0 }
}

const props = defineProps<PlayRouteProps>()

const session = usePuzzleSession({
  gameId: 'watersort',
  slot: saveSlot,
  variants: DIFFICULTIES,
  newGame: () => props.newGame,
  variantOf: (save) => save.puzzle.difficulty,
  create: (difficulty) => fresh(generatePuzzle(difficulty, randomSeed())),
  onShow: () => {
    selected.value = null
    hint.value = null
    hintPlan = []
    poured.value = null
    refused.value = null
  },
  onUndo: () => undo(),
  // Let the last pour finish (and the cork pop on) before the dialog opens.
  resultDelayMs: 2200,
})
const { status, game, stopwatch, result, showResult, showRules, markStarted, persist, saveProgress } = session

const sorted = computed(() => game.value?.tubes.filter(isComplete).length ?? 0)
const levelLabel = computed(() =>
  game.value
    ? t('watersort.variantLabel', {
        difficulty: t(`difficulty.${game.value.puzzle.difficulty}`),
        size: sizeLabel(game.value.puzzle.difficulty),
      })
    : '',
)

// --- Playing -----------------------------------------------------------------------

function doPour(g: WaterSortSave, from: number, to: number): boolean {
  const step = pour(g.tubes, { from, to })
  if (!step) return false
  markStarted()
  g.tubes = step.tubes
  g.history = [...g.history, step.move]
  g.moves += 1
  const followsPlan = hintPlan[0]?.from === from && hintPlan[0]?.to === to
  hintPlan = followsPlan ? hintPlan.slice(1) : []
  hint.value = null
  selected.value = null
  poured.value = { from, to, amount: step.move.amount, key: ++animationKey }
  if (isSolved(g.tubes)) session.win()
  else persist()
  return true
}

function onSelect(tube: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  const from = selected.value
  if (from === null) {
    if (g.tubes[tube]!.length > 0) selected.value = tube
    return
  }
  if (from === tube) {
    selected.value = null
    return
  }
  if (doPour(g, from, tube)) return
  if (g.tubes[tube]!.length > 0 && g.tubes[tube]!.length < 4 && !isComplete(g.tubes[tube]!)) {
    // Not allowed onto this tube – but the player probably wants to pick it up instead.
    selected.value = tube
    return
  }
  refused.value = { tube, key: ++animationKey }
  showToast(t('watersort.play.notAllowed'))
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.history.length ?? 0) > 0)

function undo(): void {
  const g = game.value
  if (!g || !canUndo.value) return
  const last = g.history[g.history.length - 1]!
  g.tubes = unpour(g.tubes, last)
  g.history = g.history.slice(0, -1)
  g.moves += 1
  selected.value = null
  hint.value = null
  hintPlan = []
  poured.value = { to: last.from, amount: last.amount, key: ++animationKey }
  persist()
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  selected.value = null
  const moves = hintPlan.length ? hintPlan : solve(g.tubes)
  hintPlan = moves ?? []
  g.hintsUsed += 1
  if (!moves || moves.length === 0) {
    hint.value = null
    showToast(t('watersort.play.deadEnd'))
  } else {
    hint.value = moves[0]!
  }
  saveProgress()
}

function applyHint(): void {
  const g = game.value
  const h = hint.value
  if (!g || !h) return
  doPour(g, h.from, h.to)
}

// --- Restart -------------------------------------------------------------------------

const confirmRestart = ref(false)

function confirmedRestart(): void {
  confirmRestart.value = false
  if (game.value) session.restart(fresh(game.value.puzzle))
}

// --- Result ----------------------------------------------------------------------------

const resultRows = computed(() => {
  const g = game.value
  if (!g || !result.value) return []
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${g.puzzle.difficulty}`) },
    { label: t('common.size'), value: sizeLabel(g.puzzle.difficulty) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('watersort.play.moves'), value: String(g.moves) },
    { label: t('common.hints'), value: String(g.hintsUsed) },
  ]
})

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="t('watersort.name')"
    back-to="/watersort"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('watersort.play.rules')"
    :rules-title="t('watersort.rules.title')"
  >
    <WaterSortRules />
  </PlayBar>

  <main v-if="game" class="puzzle-play">
    <GameBackdrop game="watersort" />
    <div class="info" aria-live="polite">
      <p v-if="hint" class="info__hint">
        <strong>{{ t('watersort.play.hint') }}:</strong>
        {{ t('watersort.play.hintMove', { from: hint.from + 1, to: hint.to + 1 }) }}
      </p>
      <div v-else class="hud tabular">
        <div class="hud__item">
          <span class="hud__label">{{ t('common.difficulty') }}</span>
          <span class="hud__value hud__value--level">{{ levelLabel }}</span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('watersort.play.moves') }}</span>
          <span class="hud__value">{{ game.moves }}</span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('watersort.play.sorted') }}</span>
          <span class="hud__value">{{ sorted }} / {{ game.puzzle.colors }}</span>
        </div>
      </div>
    </div>

    <div class="board-wrap">
      <WaterSortBoard
        :tubes="game.tubes"
        :selected="selected"
        :hint="hint"
        :poured="poured"
        :refused="refused"
        :symbols="waterSortSettings.showSymbols"
        :disabled="status !== 'playing'"
        @select="onSelect"
      />
    </div>

    <div v-if="hint" class="toolbar">
      <AppButton
        class="toolbar__icon"
        icon="close"
        :label="t('common.close')"
        @click="hint = null"
      />
      <AppButton variant="primary" @click="applyHint">{{ t('common.apply') }}</AppButton>
    </div>
    <div v-else class="toolbar">
      <AppButton icon="undo" :disabled="!canUndo" @click="undo">{{ t('watersort.play.undo') }}</AppButton>
      <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">{{ t('common.hint') }}</AppButton>
      <AppButton
        class="toolbar__icon"
        icon="restart"
        :disabled="status !== 'playing'"
        :label="t('watersort.play.restart')"
        @click="confirmRestart = true"
      />
    </div>
  </main>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('watersort.play.restartConfirm')"
    :confirm-label="t('watersort.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :on-menu="session.goToMenu"
    :menu-label="t('watersort.play.toMenu')"
    :on-home="session.goHome"
    :open="showResult"
    :title="t('common.solved')"
    :share="result && game ? { game: 'watersort', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="t('watersort.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="session.playAgain">{{ t('common.newGame') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  flex: none;
}

.info__hint {
  font-size: var(--text-sm);
  text-align: center;
}

.hud__value--level {
  font-size: var(--text-md);
  color: var(--game-watersort);
}

.board-wrap {
  display: flex;
  flex: 1;
  align-items: center;
  width: 100%;
  max-width: 460px;
}
</style>
