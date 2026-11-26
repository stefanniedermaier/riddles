<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { motionEnabled } from '@/core/theme'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import ArrowsBoard from './ArrowsBoard.vue'
import type { Bump, LeavingArrow } from './boardTypes'
import ArrowsRules from './ArrowsRules.vue'
import { DIFFICULTIES, saveSlot } from './index'
import { arrowAt, hintArrow, tapArrow } from './logic/rules'
import { LIVES, type ArrowsPuzzle, type ArrowsSave } from './logic/types'
import { arrowsPool } from './pool'
import { arrowsSettings } from './settings'
import type { PlayRouteProps } from '../routes'

/** Duration of the slide-out animation (ms). */
const LEAVE_MS = 420

const leaving = ref<LeavingArrow[]>([])
const bump = ref<Bump | null>(null)
const highlight = ref<number | null>(null)

function freshAttempt(next: ArrowsPuzzle): ArrowsSave {
  return { puzzle: next, removed: [], lives: LIVES, actions: 0, elapsedMs: 0, hintsUsed: 0 }
}

const props = defineProps<PlayRouteProps>()

const session = usePuzzleSession({
  gameId: 'arrows',
  slot: saveSlot,
  variants: DIFFICULTIES,
  newGame: () => props.newGame,
  variantOf: (save) => save.puzzle.difficulty,
  create: async (difficulty) => freshAttempt(await arrowsPool.take(difficulty)),
  onShow: () => {
    leaving.value = []
    bump.value = null
    highlight.value = null
  },
  // Let the last arrow slide out before the dialog covers the board.
  resultDelayMs: LEAVE_MS + 300,
})
const { status, game, stopwatch, result, showResult, showRules, later, markStarted, persist } = session

const puzzle = computed(() => game.value?.puzzle ?? null)
const arrowsLeft = computed(() =>
  game.value ? game.value.puzzle.arrows.length - game.value.removed.length : 0,
)
/** "Easy · 6×6" – shown in the HUD (the app bar is too narrow for it on phones). */
const levelLabel = computed(() =>
  puzzle.value
    ? t('arrows.variantLabel', {
        difficulty: t(`difficulty.${puzzle.value.difficulty}`),
        size: t('arrows.sizeLabel', { size: puzzle.value.size }),
      })
    : '',
)

// --- Playing -----------------------------------------------------------------------

let animationKey = 0

function onTap(cell: number): void {
  const current = game.value
  if (!current || status.value !== 'playing') return
  const id = arrowAt(current.puzzle, current.removed, cell)
  if (id < 0) return
  const outcome = tapArrow(current.puzzle, current, id)
  if (outcome.kind === 'none') return

  markStarted()
  current.actions += 1
  highlight.value = null

  if (outcome.kind === 'exit') {
    current.removed = outcome.state.removed
    const key = ++animationKey
    leaving.value = [...leaving.value, { id, key }]
    later(() => (leaving.value = leaving.value.filter((entry) => entry.key !== key)), motionEnabled.value ? LEAVE_MS : 0)
    if (outcome.solved) session.win()
    else persist()
    return
  }

  current.lives = outcome.state.lives
  bump.value = { arrow: id, blocker: outcome.blocker, key: ++animationKey }
  const bumpKey = bump.value.key
  later(() => {
    if (bump.value?.key === bumpKey) bump.value = null
  }, 900)
  if (outcome.failed) fail()
  else {
    showToast(t('arrows.play.blocked'))
    persist()
  }
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  if (!game.value || status.value !== 'playing') return
  const id = hintArrow(game.value.puzzle, game.value.removed)
  if (id === null) return
  highlight.value = id
  game.value.hintsUsed += 1
  showToast(t('arrows.play.hintShown'))
  persist()
}

// --- Restart -------------------------------------------------------------------------

const confirmRestart = ref(false)

/** Starts the same puzzle again (after a failure or via Restart). */
function restartAttempt(): void {
  if (game.value) session.restart(freshAttempt(game.value.puzzle))
}

function confirmedRestart(): void {
  confirmRestart.value = false
  restartAttempt()
}

// --- End of an attempt ------------------------------------------------------------

function fail(): void {
  if (!game.value) return
  stopwatch.pause()
  status.value = 'lost'
  saveSlot.clear()
  result.value = { timeMs: Math.round(stopwatch.elapsedMs.value), newBest: false }
  later(() => (showResult.value = true), motionEnabled.value ? 700 : 0)
}

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  const rows = [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('arrows.sizeLabel', { size: p.size }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
  ]
  if (status.value === 'won') {
    rows.push({ label: t('arrows.result.livesLeft'), value: `${game.value.lives} / ${LIVES}`, highlight: false })
  } else {
    rows.push({ label: t('arrows.result.arrowsLeft'), value: String(arrowsLeft.value), highlight: false })
  }
  rows.push({ label: t('common.hints'), value: String(game.value.hintsUsed), highlight: false })
  return rows
})

function tryAgain(): void {
  showResult.value = false
  restartAttempt()
}

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="t('arrows.name')"
    back-to="/arrows"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('arrows.play.rules')"
    :rules-title="t('arrows.rules.title')"
  >
    <ArrowsRules />
  </PlayBar>

  <main class="puzzle-play">
    <GameBackdrop game="arrows" />
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <div class="hud tabular">
        <div class="hud__item">
          <span class="hud__label">{{ t('common.difficulty') }}</span>
          <span class="hud__value hud__value--level">{{ levelLabel }}</span>
        </div>
        <div class="hud__item" :aria-label="t('arrows.play.livesValue', { lives: game.lives, max: LIVES })">
          <span class="hud__label">{{ t('arrows.play.lives') }}</span>
          <span class="hearts" aria-hidden="true">
            <svg
              v-for="i in LIVES"
              :key="i"
              class="heart"
              :class="{ 'heart--lost': i > game.lives }"
              viewBox="0 0 24 24"
            >
              <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.2 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
            </svg>
          </span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('arrows.play.left') }}</span>
          <span class="hud__value">{{ arrowsLeft }}</span>
        </div>
      </div>

      <div class="board-wrap">
        <ArrowsBoard
          :size="game.puzzle.size"
          :arrows="game.puzzle.arrows"
          :removed="game.removed"
          :leaving="leaving"
          :bump="bump"
          :highlight="highlight"
          :show-blocked-path="arrowsSettings.showBlockedPath"
          :disabled="status !== 'playing'"
          @tap="onTap"
        />
      </div>

      <div class="toolbar">
        <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">
          {{ t('common.hint') }}
        </AppButton>
        <AppButton icon="restart" :disabled="status !== 'playing'" @click="confirmRestart = true">
          {{ t('arrows.play.restart') }}
        </AppButton>
      </div>
    </template>
  </main>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('arrows.play.restartConfirm')"
    :confirm-label="t('arrows.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :on-menu="session.goToMenu"
    :menu-label="t('arrows.play.toMenu')"
    :on-home="session.goHome"
    :open="showResult"
    :title="status === 'won' ? t('common.solved') : t('arrows.result.failedTitle')"
    :subtitle="status === 'won' ? t('arrows.result.solvedText') : t('arrows.result.failedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
    :icon="status === 'won' ? 'trophy' : 'restart'"
    :share="status === 'won' && result && game ? { game: 'arrows', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
  >
    <template #actions>
      <template v-if="status === 'won'">
        <AppButton variant="primary" block @click="session.playAgain">{{ t('common.newGame') }}</AppButton>
      </template>
      <template v-else>
        <AppButton variant="primary" block @click="tryAgain">{{ t('arrows.result.tryAgain') }}</AppButton>
        <AppButton block @click="session.playAgain">{{ t('arrows.result.newPuzzle') }}</AppButton>
      </template>
    </template>
  </ResultDialog>
</template>

<style scoped>
.hud__value--level {
  font-size: var(--text-md);
  color: var(--game-arrows);
}

.hearts {
  display: flex;
  gap: 2px;
  height: 28px;
  align-items: center;
}

.heart {
  width: 22px;
  height: 22px;
  fill: var(--color-error);
  transition:
    opacity var(--dur-med),
    transform var(--dur-med) var(--ease-out);
}

.heart--lost {
  fill: var(--color-surface-3);
  transform: scale(0.85);
}

.board-wrap {
  /* Width-bound on phones, height-bound on short screens. */
  width: min(100%, 520px, calc(100dvh - 270px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  min-width: min(100%, 260px);
}
</style>
