<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { getVariantStats, recordFinish, recordStart } from '@/core/stats'
import { motionEnabled } from '@/core/theme'
import { useCountdown } from '@/core/timer'
import { showToast } from '@/core/toast'
import { useBoardAnimator } from './animator'
import { findAnyMove } from './logic/board'
import { getLevel, goalStatus } from './logic/levels'
import { completeLevel, createRun, playMove, type ShapesRun } from './logic/modes'
import type { Mode } from './logic/types'
import { IDLE_HINT_MS, shapesSettings } from './settings'
import ShapesBoard from './ShapesBoard.vue'
import ShapesHud from './ShapesHud.vue'
import { clearRun, levelProgress, loadRun, recordLevelWin, saveRun } from './store'

const props = defineProps<{ mode: Mode }>()

const route = useRoute()
const router = useRouter()

// ---------------------------------------------------------------------------
// Run setup: either a new run (`?new=1`, optionally `&level=n`) or the saved one.

function newRun(level?: number): ShapesRun {
  return createRun(props.mode, randomSeed(), level ?? 1)
}

const isNew = route.query.new === '1'
// Levels are played in order: a new level run always starts the current level.
const initial: ShapesRun | null = isNew
  ? newRun(levelProgress.value.level)
  : loadRun(props.mode)

const run = shallowRef<ShapesRun | null>(initial)
const finished = ref(false)

const animator = useBoardAnimator(motionEnabled)
const displayScore = ref(initial?.score ?? 0)
if (initial) animator.show(initial.board, initial.level?.field)

// ---------------------------------------------------------------------------
// Time mode

const timeUpPending = ref(false)
const bonusMs = ref(0)
const bonusKey = ref(0)

const countdown =
  props.mode === 'time' && initial?.time
    ? useCountdown(initial.time.limitMs, onTimeUp, initial.time.elapsedMs)
    : null

function onTimeUp(): void {
  if (animator.animating.value) timeUpPending.value = true
  else endTimeRun()
}

// ---------------------------------------------------------------------------
// UI state

const menuOpen = ref(false)
const selected = ref<number | null>(null)
const hint = ref<[number, number] | null>(null)

type ResultState =
  | { kind: 'time'; score: number; best: number; newBest: boolean }
  | { kind: 'won'; level: number; score: number; bonus: number; total: number }
  | { kind: 'lost'; level: number; score: number }

const result = ref<ResultState | null>(null)

const locked = computed(
  () =>
    animator.animating.value ||
    menuOpen.value ||
    result.value !== null ||
    timeUpPending.value ||
    finished.value,
)

const levelDef = computed(() => (run.value?.level ? getLevel(run.value.level.n) : null))
const goals = computed(() =>
  run.value?.level && levelDef.value
    ? goalStatus(levelDef.value, run.value.score, run.value.level.progress, run.value.level.field)
    : undefined,
)

const title = computed(() =>
  props.mode === 'levels' && run.value?.level
    ? t('shapes.hud.level', { level: run.value.level.n })
    : t(`shapes.modes.${props.mode}`),
)

// ---------------------------------------------------------------------------
// Persistence

function persist(): void {
  const current = run.value
  if (!current || finished.value) return
  if (countdown && current.time) {
    saveRun({
      ...current,
      time: { limitMs: countdown.limitMs.value, elapsedMs: countdown.elapsedMs.value },
    })
  } else {
    saveRun(current)
  }
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

// ---------------------------------------------------------------------------
// Idle hint

let hintTimer: ReturnType<typeof setTimeout> | undefined

function clearHint(): void {
  clearTimeout(hintTimer)
  hint.value = null
}

function scheduleHint(): void {
  clearHint()
  if (!shapesSettings.value.idleHint) return
  hintTimer = setTimeout(() => {
    if (locked.value || !run.value) return
    const move = findAnyMove(run.value.board, run.value.level?.field)
    hint.value = move ? [move.a, move.b] : null
  }, IDLE_HINT_MS)
}

// ---------------------------------------------------------------------------
// Playing

async function onSwap(a: number, b: number): Promise<void> {
  const current = run.value
  if (!current || locked.value) return
  clearHint()
  selected.value = null

  const outcome = playMove(current, a, b)
  if (outcome.result.valid) {
    run.value = outcome.run
    if (countdown && outcome.timeBonusMs > 0) {
      countdown.addTime(outcome.timeBonusMs)
      bonusMs.value = outcome.timeBonusMs
      bonusKey.value++
    }
    persist()
  }

  await animator.play(outcome.result.phases, outcome.result.board, {
    onClear: (score) => {
      displayScore.value += score
    },
    onShuffle: () => showToast(t('shapes.board.shuffled')),
  }, run.value?.level?.field)
  displayScore.value = run.value?.score ?? 0

  if (outcome.levelState === 'won') finishLevel(true)
  else if (outcome.levelState === 'lost') finishLevel(false)
  else if (timeUpPending.value) endTimeRun()
  else scheduleHint()
}

function endTimeRun(): void {
  const current = run.value
  if (!current || finished.value) return
  timeUpPending.value = false
  finished.value = true
  clearHint()
  clearRun('time')
  const { newBestScore } = recordFinish('shapes', 'time', { score: current.score })
  result.value = {
    kind: 'time',
    score: current.score,
    best: getVariantStats('shapes', 'time').bestScore ?? current.score,
    newBest: newBestScore,
  }
}

function finishLevel(won: boolean): void {
  const current = run.value
  if (!current?.level || finished.value) return
  finished.value = true
  clearHint()
  clearRun('levels')
  if (won) {
    const done = completeLevel(current)
    recordLevelWin(current.level.n)
    recordFinish('shapes', 'levels', { score: done.finalScore })
    displayScore.value = done.finalScore
    result.value = {
      kind: 'won',
      level: current.level.n,
      score: current.score,
      bonus: done.bonus,
      total: done.finalScore,
    }
  } else {
    result.value = { kind: 'lost', level: current.level.n, score: current.score }
  }
}

/** Replaces the current run (new game, next level, retry). */
function startRun(next: ShapesRun): void {
  run.value = next
  finished.value = false
  result.value = null
  menuOpen.value = false
  timeUpPending.value = false
  selected.value = null
  bonusMs.value = 0
  displayScore.value = next.score
  animator.show(next.board, next.level?.field)
  recordStart('shapes', props.mode)
  if (countdown && next.time) {
    countdown.reset(next.time.limitMs, next.time.elapsedMs)
    countdown.start()
  }
  persist()
  scheduleHint()
}

// ---------------------------------------------------------------------------
// Menu & result actions

function openMenu(): void {
  clearHint()
  selected.value = null
  menuOpen.value = true
}

function resume(): void {
  menuOpen.value = false
  scheduleHint()
}

function newGame(): void {
  const current = run.value
  if (props.mode === 'zen' && current && current.score > 0) {
    recordFinish('shapes', 'zen', { score: current.score })
  }
  startRun(newRun(current?.level?.n))
}

/** Plays the current level (the next one after a win, the same one after a loss). */
function playCurrentLevel(): void {
  startRun(createRun('levels', 0, levelProgress.value.level))
}

function toLobby(): void {
  // returnTo avoids piling up history entries (push would make "back" return to the game).
  void returnTo(router, { name: 'shapes' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

const resultRows = computed(() => {
  const r = result.value
  if (!r) return []
  switch (r.kind) {
    case 'time':
      return [
        { label: t('common.score'), value: formatNumber(r.score), highlight: r.newBest },
        { label: t('common.best'), value: formatNumber(r.best) },
      ]
    case 'won':
      return [
        { label: t('common.score'), value: formatNumber(r.score) },
        { label: t('shapes.result.moveBonus'), value: `+${formatNumber(r.bonus)}` },
        { label: t('shapes.result.total'), value: formatNumber(r.total), highlight: true },
      ]
    case 'lost':
    default:
      return [{ label: t('common.score'), value: formatNumber(r.score) }]
  }
})

const resultTitle = computed(() => {
  switch (result.value?.kind) {
    case 'time':
      return t('shapes.result.timeUp')
    case 'won':
      return t('shapes.result.levelComplete')
    case 'lost':
      return t('shapes.result.levelFailed')
    default:
      return ''
  }
})

// ---------------------------------------------------------------------------
// Lifecycle

// The timer runs only while actually playing.
watch(
  [menuOpen, result, finished],
  () => {
    if (!countdown) return
    if (menuOpen.value || result.value || finished.value) countdown.pause()
    else countdown.start()
  },
  { immediate: false },
)

onMounted(() => {
  if (!run.value) {
    // Nothing to resume – back to the lobby.
    void router.replace({ name: 'shapes' })
    return
  }
  if (isNew) {
    recordStart('shapes', props.mode)
    persist()
    // Drop `?new=1` so that a reload resumes this run instead of starting another one.
    void router.replace({ name: 'shapes-play', params: { mode: props.mode } })
  }
  countdown?.start()
  document.addEventListener('visibilitychange', onVisibilityChange)
  scheduleHint()
})

onBeforeUnmount(() => {
  persist()
  clearHint()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <AppBar :title="title" :back-to="{ name: 'shapes' }">
    <template #actions>
      <button
        v-if="run"
        type="button"
        class="icon-btn"
        :aria-label="t('common.pause')"
        :disabled="finished"
        @click="openMenu"
      >
        <AppIcon name="pause" />
      </button>
    </template>
  </AppBar>

  <main v-if="run" class="page play">
    <ShapesHud
      :mode="mode"
      :score="displayScore"
      :remaining-ms="countdown?.remainingMs.value"
      :bonus-ms="bonusMs"
      :bonus-key="bonusKey"
      :moves-left="run.level?.movesLeft"
      :goals="goals"
    />
    <div class="board-wrap" :class="{ 'board-wrap--levels': mode === 'levels' }">
      <ShapesBoard
        :pieces="animator.pieces.value"
        :popups="animator.popups.value"
        :field="animator.field.value"
        :selected="selected"
        :hint="hint"
        :locked="locked"
        @swap="onSwap"
        @select="selected = $event"
        @interact="scheduleHint"
      />
    </div>
  </main>

  <AppDialog :open="menuOpen" :title="t('shapes.pause.title')" @close="resume">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="resume">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="restart" block @click="newGame">
        {{ mode === 'levels' ? t('shapes.pause.restartLevel') : t('shapes.pause.newGame') }}
      </AppButton>
      <AppButton variant="ghost" icon="back" block @click="toLobby">
        {{ t('shapes.pause.quit') }}
      </AppButton>
    </div>
  </AppDialog>

  <ResultDialog
    :open="result !== null"
    :title="resultTitle"
    :subtitle="result?.kind === 'lost' ? t('shapes.result.levelFailedText') : undefined"
    :rows="resultRows"
    :badge="result?.kind === 'time' && result.newBest ? t('common.newBest') : undefined"
    :icon="result?.kind === 'lost' ? 'restart' : 'trophy'"
  >
    <template #actions>
      <template v-if="result?.kind === 'time'">
        <AppButton variant="primary" block @click="startRun(newRun())">
          {{ t('shapes.result.playAgain') }}
        </AppButton>
        <AppButton block @click="toLobby">{{ t('shapes.result.menu') }}</AppButton>
      </template>
      <template v-else-if="result?.kind === 'won'">
        <AppButton variant="primary" block @click="playCurrentLevel">
          {{ t('shapes.result.nextLevel') }}
        </AppButton>
      </template>
      <template v-else-if="result?.kind === 'lost'">
        <AppButton variant="primary" block @click="playCurrentLevel">
          {{ t('shapes.result.retry') }}
        </AppButton>
      </template>
      <AppButton variant="ghost" icon="home" block @click="toHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.play {
  display: flex;
  flex-direction: column;
  padding-top: var(--space-2);
}

.board-wrap {
  width: min(
    100%,
    520px,
    calc(100dvh - 210px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
  min-width: 260px;
  margin: 0 auto;
}

.board-wrap--levels {
  width: min(
    100%,
    520px,
    calc(100dvh - 250px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
