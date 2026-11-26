<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { dialogOpen } from '@/core/dialogs'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { getVariantStats, recordFinish, recordStart } from '@/core/stats'
import { motionEnabled } from '@/core/theme'
import type { PlayRouteProps } from '../routes'
import type { Variant } from './index'
import { newRun, obstaclesOf, step, stepInterval, type SnakeRun } from './logic/engine'
import { OPPOSITE, type Direction } from './logic/types'
import SnakeBoard from './SnakeBoard.vue'
import SnakePad from './SnakePad.vue'
import SnakeRules from './SnakeRules.vue'
import { snakeSettings } from './settings'
import { chosenSpeed } from './speeds'
import { clearRun, loadRun, recordBestSpeed, saveRun } from './store'
import { useSnakeLoop } from './useSnakeLoop'

const props = defineProps<PlayRouteProps & { variant: Variant }>()

const router = useRouter()

/** The death blink runs this long before the result dialog opens (with motion). */
const DEATH_MS = 900

// ---------------------------------------------------------------------------
// Run setup: a new run (`?new=1`) or the saved one of this mode.

const isNew = props.newGame === '1'
const initial: SnakeRun | null = isNew ? newRun(props.variant, chosenSpeed.value, randomSeed()) : loadRun(props.variant)
const run = shallowRef<SnakeRun | null>(initial)
/** Tail cell given up by the last step (the board lets the tail glide out of it). */
const leftTail = ref<number | null>(null)

if (isNew) {
  // Drop `?new=1` right away so a reload resumes this run instead of starting another one.
  void router.replace({ name: 'snake-play', params: { variant: props.variant } })
}

const calm = computed(() => run.value?.speed === 'calm')
const stones = computed(() => (run.value ? obstaclesOf(run.value) : []))

// ---------------------------------------------------------------------------
// Persistence – a run is saved once it has taken a step: on every fruit, every pause and
// when leaving (not on every step).

function persist(): void {
  const current = run.value
  if (!current || current.over) return
  if (current.steps === 0) clearRun(props.variant)
  else saveRun(current)
}

// ---------------------------------------------------------------------------
// Dialogs and result

const menuOpen = ref(false)
const showRules = ref(false)
const confirmNew = ref(false)

interface GameOverResult {
  score: number
  best: number
  length: number
  won: boolean
  newBest: boolean
}

const result = ref<GameOverResult | null>(null)
const dying = ref(false)

const bestScore = computed(() =>
  Math.max(getVariantStats('snake', props.variant).bestScore ?? 0, run.value?.score ?? 0),
)

// ---------------------------------------------------------------------------
// Steps

function advance(turn: Direction | undefined): boolean {
  const current = run.value
  if (!current || current.over) return false
  if (current.steps === 0) recordStart('snake', props.variant)
  const outcome = step(current, turn)
  run.value = outcome.run
  leftTail.value = outcome.leftTail
  if (outcome.run.over) {
    finishRun(outcome.run)
    return false
  }
  if (outcome.ate) persist()
  return true
}

const loop = useSnakeLoop({
  interval: () => (run.value ? stepInterval(run.value) : 1000),
  direction: () => run.value?.direction ?? 'right',
  step: advance,
})

/** Waiting for the first input – at the start and after every pause. */
const waiting = ref(true)

function play(): void {
  if (!run.value || run.value.over || blocked.value || calm.value) return
  waiting.value = false
  loop.start()
}

function pause(): void {
  if (!loop.running.value) return
  loop.pause()
  waiting.value = true
  persist()
}

const blocked = computed(
  () => !run.value || run.value.over || dialogOpen.value || result.value !== null || dying.value,
)

// Any dialog pauses the game (menu, rules, an update prompt …).
watch(dialogOpen, (open) => {
  if (open) pause()
})

/** Records score and best speed of a run that had steps. */
function recordRun(current: SnakeRun): boolean {
  const before = getVariantStats('snake', props.variant).bestScore
  const { newBestScore } = recordFinish('snake', props.variant, { score: current.score })
  // The speed belongs to the best score: kept with the first score and every better one.
  if (before === undefined || current.score > before) recordBestSpeed(props.variant, current.speed)
  return newBestScore
}

let resultTimer: ReturnType<typeof setTimeout> | undefined

function finishRun(current: SnakeRun): void {
  loop.pause()
  clearRun(props.variant)
  const newBest = recordRun(current)
  const show = () => {
    dying.value = false
    result.value = {
      score: current.score,
      best: bestScore.value,
      length: current.body.length,
      won: current.won,
      newBest,
    }
  }
  if (motionEnabled.value && !current.won) {
    dying.value = true
    resultTimer = setTimeout(show, DEATH_MS)
  } else {
    show()
  }
}

// ---------------------------------------------------------------------------
// Input

/** Screen readers: where the fruit is, after every step of the calm speed (polite). */
const summary = ref('')

function describe(current: SnakeRun): string {
  if (current.food < 0) return t('snake.play.summary', { length: current.body.length, where: t('snake.play.noFood') })
  const size = current.size
  const head = current.body[0]!
  const dx = (current.food % size) - (head % size)
  const dy = Math.floor(current.food / size) - Math.floor(head / size)
  const parts = [
    dx !== 0 ? t(`snake.play.towards.${dx > 0 ? 'right' : 'left'}`, { n: Math.abs(dx) }) : null,
    dy !== 0 ? t(`snake.play.towards.${dy > 0 ? 'down' : 'up'}`, { n: Math.abs(dy) }) : null,
  ].filter(Boolean)
  return t('snake.play.summary', { length: current.body.length, where: parts.join(', ') })
}

function onTurn(direction: Direction): void {
  if (blocked.value || !run.value) return
  if (calm.value) {
    // One step per input; the same direction again moves straight on.
    if (direction === OPPOSITE[run.value.direction]) return
    waiting.value = false
    if (advance(direction) && run.value) summary.value = describe(run.value)
    return
  }
  loop.turn(direction)
  if (!loop.running.value) play()
}

function onTap(): void {
  if (blocked.value || !run.value) return
  if (calm.value) onTurn(run.value.direction)
  else if (!loop.running.value) play()
}

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen.value) return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  const direction = KEYS[key]
  if (direction) {
    event.preventDefault()
    onTurn(direction)
    return
  }
  if (key === ' ' || key === 'p' || key === 'Escape') {
    // Space on a focused button presses that button instead.
    if (key === ' ' && target?.closest('button')) return
    event.preventDefault()
    if (loop.running.value) pause()
    else if (key !== 'Escape') onTap()
  }
}

// The app in the background, another window focused: pause.
function onVisibilityChange(): void {
  if (document.hidden) pause()
}

function onBlur(): void {
  pause()
}

// ---------------------------------------------------------------------------
// Menu & dialogs

function startNew(): void {
  const current = run.value
  if (current && current.steps > 0 && !current.over) recordRun(current)
  clearTimeout(resultTimer)
  loop.pause()
  loop.clear()
  menuOpen.value = false
  confirmNew.value = false
  result.value = null
  dying.value = false
  waiting.value = true
  leftTail.value = null
  summary.value = ''
  run.value = newRun(props.variant, chosenSpeed.value, randomSeed())
  persist()
}

function requestNew(): void {
  if (run.value && run.value.steps > 0 && !run.value.over) {
    menuOpen.value = false
    confirmNew.value = true
  } else {
    startNew()
  }
}

function toMenu(): void {
  menuOpen.value = false
  void returnTo(router, { name: 'snake' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

const resultRows = computed(() => {
  const r = result.value
  if (!r || !run.value) return []
  return [
    { label: t('common.score'), value: formatNumber(r.score), highlight: r.newBest },
    { label: t('common.best'), value: formatNumber(r.best) },
    { label: t('snake.result.length'), value: formatNumber(r.length) },
    { label: t('snake.result.speed'), value: t(`snake.speeds.${run.value.speed}`) },
  ]
})

// ---------------------------------------------------------------------------
// Lifecycle

onMounted(() => {
  if (!run.value) {
    // Nothing to resume – back to the lobby.
    void router.replace({ name: 'snake' })
    return
  }
  if (isNew) persist() // drops an older, replaced save of this mode
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', onBlur)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(resultTimer)
  loop.pause()
  persist()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <AppBar :title="t(`snake.variants.${variant}`)" :back-to="{ name: 'snake' }">
    <template #actions>
      <button type="button" class="icon-btn" :aria-label="t('common.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
      <button
        v-if="run"
        type="button"
        class="icon-btn"
        :aria-label="t('common.pause')"
        :disabled="result !== null"
        @click="menuOpen = true"
      >
        <AppIcon name="pause" />
      </button>
    </template>
  </AppBar>

  <main v-if="run" class="play" :class="{ 'play--pad': snakeSettings.pad }">
    <GameBackdrop game="snake" />
    <section class="hud">
      <div class="hud__stat">
        <span class="hud__label">{{ t('common.score') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(run.score) }}</strong>
      </div>
      <div class="hud__stat">
        <span class="hud__label">{{ t('snake.play.length') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(run.body.length) }}</strong>
      </div>
      <div class="hud__stat hud__stat--best">
        <span class="hud__label">{{ t('snake.play.best') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(bestScore) }}</strong>
      </div>
    </section>

    <div class="board-wrap">
      <SnakeBoard
        :size="run.size"
        :body="run.body"
        :left-tail="leftTail"
        :progress="loop.progress.value"
        :direction="run.direction"
        :food="run.food"
        :stones="stones"
        :wrap="variant === 'open'"
        :dead="dying"
        @turn="onTurn"
        @tap="onTap"
        @multitouch="pause"
      />
      <p v-if="waiting && !calm && !run.over" class="board-note">
        <span>{{ run.steps === 0 ? t('snake.play.start') : t('snake.play.resume') }}</span>
      </p>
    </div>

    <SnakePad v-if="snakeSettings.pad" @turn="onTurn" />
    <p class="hint muted">{{ calm ? t('snake.play.calmHint') : t('snake.play.hint') }}</p>
    <p class="visually-hidden" aria-live="polite">{{ summary }}</p>
  </main>

  <AppDialog :open="menuOpen" :title="t('snake.pause.title')" @close="menuOpen = false">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="menuOpen = false">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="restart" block @click="requestNew">{{ t('snake.pause.newGame') }}</AppButton>
      <AppButton variant="ghost" icon="back" block @click="toMenu">{{ t('snake.pause.quit') }}</AppButton>
    </div>
  </AppDialog>

  <ConfirmDialog
    :open="confirmNew"
    :message="t('snake.pause.confirmNew')"
    :confirm-label="t('snake.pause.newGame')"
    @confirm="startNew"
    @cancel="confirmNew = false"
  />

  <ResultDialog
    :on-menu="toMenu"
    :menu-label="t('snake.result.menu')"
    :on-home="toHome"
    :open="result !== null"
    :title="result?.won ? t('snake.result.won') : t('snake.result.gameOver')"
    :share="result ? { game: 'snake', variant, result: formatNumber(result.score), kind: 'score', newBest: result.newBest } : undefined"
    :celebrate="(result?.newBest || result?.won) ?? false"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="startNew">{{ t('snake.result.playAgain') }}</AppButton>
    </template>
  </ResultDialog>
  <AppDialog :open="showRules" :title="t('snake.lobby.howToTitle')" @close="showRules = false">
    <SnakeRules />
  </AppDialog>
</template>

<style scoped>
.play {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-2) max(var(--space-3), env(safe-area-inset-right))
    max(var(--space-4), env(safe-area-inset-bottom)) max(var(--space-3), env(safe-area-inset-left));
}

.hud {
  display: flex;
  gap: var(--space-2);
  width: min(100%, 520px);
}

.hud__stat {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.hud__stat--best {
  background: color-mix(in srgb, var(--game-snake) 14%, var(--color-surface));
}

.hud__label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud__value {
  font-size: var(--text-xl);
  font-weight: 800;
}

.board-wrap {
  --reserved: 250px;

  position: relative;
  /* Width-bound on phones, height-bound on short screens. */
  width: min(
    100%,
    520px,
    calc(100dvh - var(--reserved) - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
  min-width: min(100%, 240px);
}

/* Room for the direction buttons below the board. */
.play--pad .board-wrap {
  --reserved: 380px;
}

/* Start / paused note in the lower part of the board (the snake starts in the middle);
   taps go through to the board. */
.board-note {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: end center;
  margin: 0;
  padding: var(--space-4) var(--space-4) 12%;
  pointer-events: none;
}

.board-note span {
  max-width: 18em;
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  box-shadow: var(--shadow-md);
  font-weight: 700;
  text-align: center;
}

.hint {
  font-size: var(--text-sm);
  text-align: center;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
