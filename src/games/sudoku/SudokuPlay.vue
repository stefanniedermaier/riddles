<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { checkMessage } from '@/core/check'
import { showToast } from '@/core/toast'

import { describeHint } from './explain'
import HintPanel from './HintPanel.vue'
import { isDifficulty, isMode, type Difficulty, type SudokuMode } from './logic/types'
import NumberPad from './NumberPad.vue'
import { sudokuSettings } from './settings'
import SudokuBoard from './SudokuBoard.vue'
import { useSudokuGame } from './useSudokuGame'

const route = useRoute()
const router = useRouter()
const sudoku = useSudokuGame()
const { game, status, mode, geo, notesMode, hint, result, stopwatch, digitCounts, canUndo, checkedWrong } =
  sudoku

function check(): void {
  showToast(checkMessage(sudoku.check()))
}

/** Mode requested by the route (`?mode=mini`); classic otherwise. */
const routeMode = computed<SudokuMode>(() => (isMode(route.query.mode) ? route.query.mode : 'classic'))
const playQuery = (playMode: SudokuMode) => (playMode === 'mini' ? { mode: 'mini' } : {})

const menuOpen = ref(false)
const settingsOpen = ref(false)
const confirm = ref<'restart' | 'new' | null>(null)

const difficulty = computed<Difficulty>(() => game.value?.puzzle.difficulty ?? 'easy')
const difficultyLabel = computed(() => {
  const label = t(`difficulty.${difficulty.value}`)
  return mode.value === 'mini' ? `${t('sudoku.modes.miniShort')} · ${label}` : label
})
const timeLabel = computed(() => formatDuration(stopwatch.elapsedMs.value))

const hintView = computed(() => (hint.value ? describeHint(hint.value, geo.value.size) : null))
const hintAction = computed(() => {
  switch (hint.value?.kind) {
    case 'mistake':
      return t('sudoku.hint.eraseMistakes')
    case 'step':
    case 'reveal':
      return t('sudoku.hint.fillIn')
    default:
      return undefined
  }
})

// --- start / resume -------------------------------------------------------

async function startNew(level: Difficulty, playMode: SudokuMode = mode.value): Promise<void> {
  // Drop `?new=` right away (not after the await), so that a reload resumes the saved game and
  // a late navigation can never cancel a "back" the player tapped while the puzzle is created.
  if (route.query.new !== undefined) {
    void router.replace({ name: 'sudoku-play', query: playQuery(playMode) })
  }
  await sudoku.startNew(level, playMode)
}

onMounted(() => {
  const requested = route.query.new
  if (isDifficulty(requested)) void startNew(requested, routeMode.value)
  else if (!sudoku.resume(routeMode.value)) void router.replace({ name: 'sudoku' })
})

// Pause the clock while a dialog covers the board.
const overlayOpen = computed(() => menuOpen.value || settingsOpen.value || confirm.value !== null)
watch(overlayOpen, (open) => {
  if (status.value !== 'playing') return
  if (open) stopwatch.pause()
  else stopwatch.start()
})

// --- menu actions -----------------------------------------------------------

function openConfirm(kind: 'restart' | 'new'): void {
  menuOpen.value = false
  confirm.value = kind
}

function onConfirm(): void {
  const kind = confirm.value
  confirm.value = null
  if (kind === 'restart') sudoku.restart()
  else if (kind === 'new') void startNew(difficulty.value)
}

function toLobby(): void {
  menuOpen.value = false
  void returnTo(router, { name: 'sudoku' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

// --- keyboard (desktop) -----------------------------------------------------

function onKeydown(event: KeyboardEvent): void {
  if (status.value !== 'playing' || overlayOpen.value) return
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    sudoku.undo()
    event.preventDefault()
    return
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const key = event.key
  let handled = true
  if (/^[1-9]$/.test(key)) sudoku.input(Number(key))
  else if (key === 'Backspace' || key === 'Delete' || key === '0') sudoku.erase()
  else if (key === 'ArrowUp') sudoku.moveSelection(-1, 0)
  else if (key === 'ArrowDown') sudoku.moveSelection(1, 0)
  else if (key === 'ArrowLeft') sudoku.moveSelection(0, -1)
  else if (key === 'ArrowRight') sudoku.moveSelection(0, 1)
  else if (key === 'n' || key === 'N') notesMode.value = !notesMode.value
  else if (key === 'h' || key === 'H') sudoku.requestHint()
  else if (key === 'Escape' && hint.value) sudoku.closeHint()
  else handled = false
  if (handled) event.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const resultRows = computed(() =>
  result.value
    ? [
        { label: t('common.difficulty'), value: difficultyLabel.value },
        { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
        { label: t('common.mistakes'), value: String(result.value.mistakes) },
        { label: t('common.hints'), value: String(result.value.hintsUsed) },
      ]
    : [],
)
</script>

<template>
  <AppBar :back-to="{ name: 'sudoku' }">
    <template #title>
      <h1 class="title">
        {{ t('sudoku.name') }}
        <span v-if="game" class="title__level">{{ difficultyLabel }}</span>
      </h1>
    </template>
    <template #actions>
      <GameSettingsButton game="sudoku" @open="settingsOpen = true" @close="settingsOpen = false" />
      <span v-if="status === 'playing'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="16" />
        {{ timeLabel }}
      </span>
      <button
        v-if="status === 'playing'"
        type="button"
        class="icon-btn"
        :aria-label="t('common.menu')"
        @click="menuOpen = true"
      >
        <AppIcon name="menu" />
      </button>
    </template>
  </AppBar>

  <main class="page play">
    <LoadingOverlay v-if="status === 'loading' || status === 'idle'" :label="t('common.generating')" />

    <template v-else-if="game">
      <div class="board-wrap">
        <SudokuBoard
          :givens="game.puzzle.givens"
          :values="game.values"
          :notes="game.notes"
          :selected="game.selected"
          :highlight-peers="sudokuSettings.highlightPeers"
          :highlight-same-digits="sudokuSettings.highlightSameDigits"
          :focus-cells="hintView?.focusCells"
          :target-cell="hintView?.targetCell"
          :wrong-cells="hintView?.wrongCells ?? checkedWrong"
          @select="sudoku.select"
        />
      </div>

      <div class="controls">
        <HintPanel
          v-if="hintView"
          :view="hintView"
          :action-label="hintAction"
          @apply="sudoku.applyHint"
          @close="sudoku.closeHint"
        />
        <template v-else>
          <div class="tools">
            <button type="button" class="tool" :disabled="!canUndo" @click="sudoku.undo">
              <AppIcon name="undo" :size="22" />
              <span>{{ t('sudoku.play.undo') }}</span>
            </button>
            <button
              type="button"
              class="tool"
              :class="{ 'tool--active': notesMode }"
              :aria-pressed="notesMode"
              @click="notesMode = !notesMode"
            >
              <AppIcon name="pencil" :size="22" />
              <span>{{ t('sudoku.play.notes') }}</span>
            </button>
            <button type="button" class="tool" @click="sudoku.erase">
              <AppIcon name="eraser" :size="22" />
              <span>{{ t('sudoku.play.erase') }}</span>
            </button>
            <button type="button" class="tool" :title="t('common.check')" @click="check">
              <AppIcon name="inspect" :size="22" />
              <span>{{ t('common.checkShort') }}</span>
            </button>
            <button type="button" class="tool" @click="sudoku.requestHint">
              <AppIcon name="hint" :size="22" />
              <span>{{ t('sudoku.play.hint') }}</span>
            </button>
          </div>
          <NumberPad
            :counts="digitCounts"
            :notes-mode="notesMode"
            :size="geo.size"
            @input="sudoku.input"
          />
        </template>
      </div>
    </template>
  </main>

  <AppDialog :open="menuOpen" :title="t('common.menu')" @close="menuOpen = false">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="menuOpen = false">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="plus" block @click="openConfirm('new')">{{ t('common.newGame') }}</AppButton>
      <AppButton icon="restart" block @click="openConfirm('restart')">
        {{ t('sudoku.play.restart') }}
      </AppButton>
      <AppButton icon="back" variant="ghost" block @click="toLobby">
        {{ t('sudoku.play.backToLobby') }}
      </AppButton>
    </div>
  </AppDialog>

  <ConfirmDialog
    :open="confirm !== null"
    :message="
      confirm === 'restart'
        ? t('sudoku.play.restartConfirm')
        : t('sudoku.play.newGameConfirm', { difficulty: difficultyLabel })
    "
    :confirm-label="confirm === 'restart' ? t('sudoku.play.restart') : t('common.newGame')"
    @confirm="onConfirm"
    @cancel="confirm = null"
  />

  <ResultDialog
    :open="status === 'won' && result !== null"
    :title="t('common.solved')"
    :subtitle="t('sudoku.play.solvedSubtitle', { difficulty: difficultyLabel })"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" icon="plus" block @click="startNew(difficulty)">
        {{ t('common.newGame') }}
      </AppButton>
      <AppButton block @click="toLobby">{{ t('sudoku.play.backToLobby') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="toHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.title {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

/* Second line, so long labels like "Mini · Schwer" never get cut off. */
.title__level {
  overflow: hidden;
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--game-sudoku);
}

.timer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}

.play {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-2);
}

/* The board takes the remaining height so that board + controls fit on a 360×640 screen. */
.board-wrap {
  width: min(
    100%,
    520px,
    calc(100dvh - 260px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
  min-width: 260px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  max-width: 520px;
  min-height: 132px;
}

.tools {
  display: flex;
  gap: 2px;
  justify-content: space-around;
}

.tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1 1 0;
  min-width: 0;
  max-width: 80px;
  min-height: var(--tap-min);
  padding: var(--space-1) 2px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.tool:active:not(:disabled) {
  background: var(--color-surface-2);
}

.tool:disabled {
  opacity: 0.4;
  cursor: default;
}

.tool--active {
  background: color-mix(in srgb, var(--game-sudoku) 16%, transparent);
  color: var(--game-sudoku);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
