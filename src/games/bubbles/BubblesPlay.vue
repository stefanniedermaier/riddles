<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { dialogOpen } from '@/core/dialogs'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { getVariantStats, recordFinish, recordStart } from '@/core/stats'
import { motionEnabled } from '@/core/theme'
import type { PlayRouteProps } from '../routes'
import BubblesBoard, { type Flight, type Ghost } from './BubblesBoard.vue'
import BubblesGoal from './BubblesGoal.vue'
import BubblesRules from './BubblesRules.vue'
import SpaceBackdrop from './SpaceBackdrop.vue'
import type { Variant } from './index'
import {
  comboMultiplier,
  dropInterval,
  levelBonus,
  lowestRow,
  missLimit,
  newRun,
  shoot,
  starsFor,
  swap,
  tick,
  type BubblesRun,
  type ShotResult,
} from './logic/engine'
import { BOARD_HEIGHT, centre, COLS, LIMIT, type Parity } from './logic/grid'
import { getLevel } from './logic/levels'
import { clampAngle } from './logic/trace'
import { BOMB } from './logic/types'
import { chosenAimLine, chosenSpeed } from './options'
import { bubblesSettings } from './settings'
import { clearRun, levelProgress, loadRun, recordBestSpeed, recordLevelWin, saveRun } from './store'
import { useCeilingClock } from './useCeilingClock'

const props = defineProps<PlayRouteProps & { variant: Variant }>()

const router = useRouter()

/** How long pops and falls play before the result dialog opens (with motion). */
const END_DELAY_MS = 750
/** Ghosts (popped, falling bubbles) are removed after this. */
const GHOST_MS = 1000

// ---------------------------------------------------------------------------
// Run setup: a new run (`?new=1`) or the saved one of this mode.

function createRun(): BubblesRun {
  if (props.variant === 'levels') return newRun('levels', 0, { level: getLevel(levelProgress.value.level) })
  return newRun(props.variant, randomSeed(), { speed: chosenSpeed.value })
}

const isNew = props.newGame === '1'
const run = shallowRef<BubblesRun | null>(isNew ? createRun() : loadRun(props.variant))

if (isNew) {
  // Drop `?new=1` right away so a reload resumes this run instead of starting another one.
  void router.replace({ name: 'bubbles-play', params: { variant: props.variant } })
}

/** What the board shows: the field before a shot until the bubble has landed. */
const view = shallowRef<Pick<BubblesRun, 'cells' | 'parity' | 'marked'> | null>(run.value)

// ---------------------------------------------------------------------------
// Persistence – after every shot, on every pause and when leaving.

/** A shot in flight: its outcome is applied when the bubble lands. */
let pending: { outcome: ShotResult; parity: Parity } | null = null

function persist(): void {
  const current = pending?.outcome.run ?? run.value
  if (!current || current.over) return
  if (current.shots === 0 && current.clockMs === 0) clearRun(props.variant)
  else saveRun(current)
}

// ---------------------------------------------------------------------------
// Dialogs and result

const menuOpen = ref(false)
const showRules = ref(false)
const confirmNew = ref(false)

type GameResult =
  | { kind: 'over'; score: number; best: number; shots: number; newBest: boolean }
  | { kind: 'won'; level: number; score: number; bonus: number; total: number; stars: number; shots: number }
  | { kind: 'lost'; level: number; score: number }

const result = ref<GameResult | null>(null)
const ending = ref(false)

const bestScore = computed(() =>
  Math.max(getVariantStats('bubbles', props.variant).bestScore ?? 0, run.value?.score ?? 0),
)

// ---------------------------------------------------------------------------
// Clock (time mode)

/** The player paused the time mode (or it paused itself); a tap continues. */
const paused = ref(false)

const blocked = computed(
  () => !run.value || run.value.over || dialogOpen.value || result.value !== null || ending.value,
)

const clockStarted = computed(() => !!run.value && (run.value.shots > 0 || run.value.clockMs > 0))

const clock = useCeilingClock({
  tick: (ms) => {
    const current = run.value
    // A shot in flight is resolved against the field it was fired at: the clock waits for it.
    if (!current || pending) return
    const outcome = tick(current, ms)
    run.value = outcome.run
    if (outcome.pushed) {
      view.value = outcome.run
      pushKey.value++
      if (outcome.run.over) finishRun(outcome.run)
      else persist()
    }
  },
})

const clockShouldRun = computed(
  () => props.variant === 'time' && clockStarted.value && !blocked.value && !paused.value,
)
watch(clockShouldRun, (on) => (on ? clock.start() : clock.pause()), { immediate: true })

function pause(): void {
  if (props.variant !== 'time' || !clockStarted.value || blocked.value) return
  paused.value = true
  persist()
}

/** Seconds until the ceiling comes down. */
const dropIn = computed(() =>
  run.value ? Math.max(0, Math.ceil((dropInterval(run.value) - run.value.clockMs) / 1000)) : 0,
)

// ---------------------------------------------------------------------------
// Shots

const angle = ref(90)
/** Keyboard players see the aim line all the time. */
const keyboardAim = ref(false)
const flight = shallowRef<Flight | null>(null)
const ghosts = ref<Ghost[]>([])
const pushKey = ref(0)
/** Screen readers: what a shot did (polite). */
const summary = ref('')
let ids = 0

const locked = computed(() => blocked.value || flight.value !== null || paused.value)

function onShoot(at: number): void {
  const current = run.value
  if (!current || locked.value) return
  const outcome = shoot(current, at)
  if (outcome.cell < 0) return
  if (current.shots === 0 && current.clockMs === 0) recordStart('bubbles', props.variant)
  pending = { outcome, parity: current.parity }
  flight.value = { id: ++ids, points: outcome.path, value: outcome.shot }
}

const timers = new Set<ReturnType<typeof setTimeout>>()
function later(fn: () => void, ms: number): void {
  const timer = setTimeout(() => {
    timers.delete(timer)
    fn()
  }, ms)
  timers.add(timer)
}

function onLanded(): void {
  const done = pending
  pending = null
  flight.value = null
  if (!done) return
  const { outcome, parity } = done
  run.value = outcome.run
  view.value = outcome.run
  if (outcome.pushed) pushKey.value++

  const added: Ghost[] = [
    ...outcome.popped.map((b, i) => ({ id: ++ids, ...centre(b.cell, parity), value: b.value, kind: 'pop' as const, delay: i * 22 })),
    ...outcome.fallen.map((b, i) => ({ id: ++ids, ...centre(b.cell, parity), value: b.value, kind: 'fall' as const, delay: 80 + (i % 6) * 30 })),
  ]
  if (outcome.shot === BOMB) {
    added.unshift({ id: ++ids, ...centre(outcome.cell, parity), value: BOMB, kind: 'blast', delay: 0 })
  }
  if (added.length > 0 && motionEnabled.value) {
    ghosts.value = [...ghosts.value, ...added]
    const gone = new Set(added.map((g) => g.id))
    later(() => (ghosts.value = ghosts.value.filter((g) => !gone.has(g.id))), GHOST_MS)
  }

  celebrate(outcome, parity)

  const left = outcome.run.cells.filter((value) => value >= 0).length
  summary.value =
    outcome.popped.length > 0
      ? t('bubbles.play.summary', { popped: outcome.popped.length, fallen: outcome.fallen.length, left })
      : t('bubbles.play.missed', { left })
  if (danger.value) summary.value += ` ${t('bubbles.play.danger')}`

  if (outcome.run.over) finishRun(outcome.run)
  else persist()
}

// ---------------------------------------------------------------------------
// Feedback: points flying up from the impact, praise for big drops, a bumping score.

interface Popup {
  id: number
  left: string
  top: string
  text: string
  combo: string
}

const popups = ref<Popup[]>([])
const praise = ref<{ id: number; word: PraiseWord } | null>(null)
const scoreBump = ref(0)

type PraiseWord = 'nice' | 'great' | 'stellar' | 'supernova' | 'cleared'

function praiseFor(removed: number, cleared: boolean): PraiseWord | null {
  if (cleared) return 'cleared'
  if (removed >= 24) return 'supernova'
  if (removed >= 16) return 'stellar'
  if (removed >= 10) return 'great'
  if (removed >= 6) return 'nice'
  return null
}

function celebrate(outcome: ShotResult, parity: Parity): void {
  if (outcome.points <= 0) return
  scoreBump.value++
  const at = centre(outcome.cell, parity)
  const popup: Popup = {
    id: ++ids,
    // Kept inside the field, so the number never runs into the HUD or off the side.
    left: `${(Math.min(Math.max(at.x, 1.2), COLS - 1.2) / COLS) * 100}%`,
    top: `${(Math.max(at.y, 2.4) / BOARD_HEIGHT) * 100}%`,
    text: `+${formatNumber(outcome.points)}`,
    combo: outcome.run.combo >= 2 ? t('bubbles.play.combo', { n: formatNumber(comboMultiplier(outcome.run.combo)) }) : '',
  }
  popups.value = [...popups.value, popup]
  later(() => (popups.value = popups.value.filter((p) => p.id !== popup.id)), 1100)
  const word = praiseFor(outcome.popped.length + outcome.fallen.length, outcome.cleared)
  if (word) {
    const current = { id: ++ids, word }
    praise.value = current
    later(() => {
      if (praise.value?.id === current.id) praise.value = null
    }, 1300)
  }
}

function onSwap(): void {
  if (!run.value || locked.value) return
  run.value = swap(run.value)
  persist()
}

/** The field is one row away from the danger line. */
const danger = computed(() => !!view.value && lowestRow(view.value.cells) >= LIMIT - 2)

// ---------------------------------------------------------------------------
// Result

function recordScore(current: BubblesRun): boolean {
  const before = getVariantStats('bubbles', props.variant).bestScore
  const { newBestScore } = recordFinish('bubbles', props.variant, { score: current.score })
  if (props.variant === 'time' && (before === undefined || current.score > before)) recordBestSpeed(current.speed)
  return newBestScore
}

function finishRun(current: BubblesRun): void {
  clock.pause()
  clearRun(props.variant)
  let outcome: GameResult
  if (props.variant === 'levels') {
    const def = getLevel(current.level)
    if (current.won) {
      const bonus = levelBonus(current)
      const total = current.score + bonus
      const stars = starsFor(current.shots, def.par, def.shots)
      recordLevelWin(current.level, stars)
      recordFinish('bubbles', 'levels', { score: total })
      outcome = { kind: 'won', level: current.level, score: current.score, bonus, total, stars, shots: current.shots }
    } else {
      outcome = { kind: 'lost', level: current.level, score: current.score }
    }
  } else {
    const newBest = recordScore(current)
    outcome = { kind: 'over', score: current.score, best: bestScore.value, shots: current.shots, newBest }
  }
  const show = () => {
    ending.value = false
    result.value = outcome
  }
  if (motionEnabled.value) {
    ending.value = true
    later(show, END_DELAY_MS)
  } else {
    show()
  }
}

// ---------------------------------------------------------------------------
// Keyboard

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen.value) return
  const target = event.target instanceof Element ? event.target : null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  const step = event.shiftKey ? 0.5 : 2
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    event.preventDefault()
    keyboardAim.value = true
    angle.value = clampAngle(angle.value + (key === 'ArrowLeft' ? step : -step))
    return
  }
  if (key === ' ' || key === 'Enter' || key === 'ArrowUp') {
    // Space / Enter on a focused button presses that button instead.
    if (key !== 'ArrowUp' && target?.closest('button')) return
    event.preventDefault()
    if (paused.value) paused.value = false
    else onShoot(angle.value)
    return
  }
  if (key === 'x') {
    event.preventDefault()
    onSwap()
    return
  }
  if (key === 'p' || key === 'Escape') {
    event.preventDefault()
    if (props.variant === 'time' && !paused.value) pause()
    else if (key === 'p') paused.value = false
  }
}

function onTap(): void {
  if (paused.value && !blocked.value) paused.value = false
}

function onVisibilityChange(): void {
  if (document.hidden) pause()
}

function onBlur(): void {
  pause()
}

// ---------------------------------------------------------------------------
// Menu & dialogs

function reset(next: BubblesRun): void {
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
  pending = null
  flight.value = null
  ghosts.value = []
  popups.value = []
  praise.value = null
  menuOpen.value = false
  confirmNew.value = false
  result.value = null
  ending.value = false
  paused.value = false
  summary.value = ''
  run.value = next
  view.value = next
  persist()
}

function startNew(): void {
  const current = run.value
  if (current && props.variant !== 'levels' && current.shots > 0 && !current.over) recordScore(current)
  reset(createRun())
}

function requestNew(): void {
  if (props.variant !== 'levels' && run.value && run.value.shots > 0 && !run.value.over) {
    menuOpen.value = false
    confirmNew.value = true
  } else {
    startNew()
  }
}

/** Plays the current level (the next one after a win, the same one after a loss). */
function playCurrentLevel(): void {
  reset(createRun())
}

function toMenu(): void {
  menuOpen.value = false
  void returnTo(router, { name: 'bubbles' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

const resultTitle = computed(() => {
  switch (result.value?.kind) {
    case 'won':
      return t('bubbles.result.levelComplete')
    case 'lost':
      return t('bubbles.result.levelFailed')
    default:
      return t('bubbles.result.gameOver')
  }
})

const resultRows = computed(() => {
  const r = result.value
  if (!r) return []
  if (r.kind === 'won') {
    return [
      { label: t('bubbles.result.level'), value: formatNumber(r.level) },
      { label: t('common.score'), value: formatNumber(r.score) },
      { label: t('bubbles.result.bonus'), value: formatNumber(r.bonus) },
      { label: t('bubbles.result.total'), value: formatNumber(r.total), highlight: true },
      { label: t('bubbles.result.shots'), value: formatNumber(r.shots) },
    ]
  }
  if (r.kind === 'lost') {
    return [
      { label: t('bubbles.result.level'), value: formatNumber(r.level) },
      { label: t('common.score'), value: formatNumber(r.score) },
    ]
  }
  const rows = [
    { label: t('common.score'), value: formatNumber(r.score), highlight: r.newBest },
    { label: t('common.best'), value: formatNumber(r.best) },
    { label: t('bubbles.result.shots'), value: formatNumber(r.shots) },
  ]
  if (props.variant === 'time' && run.value) rows.push({ label: t('bubbles.result.speed'), value: t(`bubbles.speeds.${run.value.speed}`) })
  return rows
})

const share = computed(() => {
  const r = result.value
  if (!r || r.kind === 'lost') return undefined
  return {
    game: 'bubbles' as const,
    variant: props.variant,
    result: formatNumber(r.kind === 'won' ? r.total : r.score),
    kind: 'score' as const,
    newBest: r.kind === 'over' && r.newBest,
  }
})

// ---------------------------------------------------------------------------
// Lifecycle

onMounted(() => {
  if (!run.value) {
    // Nothing to resume – back to the lobby.
    void router.replace({ name: 'bubbles' })
    return
  }
  if (isNew) persist() // drops an older, replaced save of this mode
  // A resumed time run waits for a tap before the ceiling moves again.
  if (props.variant === 'time' && clockStarted.value) paused.value = true
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', onBlur)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  for (const timer of timers) clearTimeout(timer)
  clock.pause()
  persist()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('blur', onBlur)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <SpaceBackdrop />
  <AppBar :title="t(`bubbles.variants.${variant}`)" :back-to="{ name: 'bubbles' }">
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

  <main v-if="run && view" class="play">
    <section class="hud">
      <div class="hud__stat bx-panel">
        <span class="bx-label">{{ t('common.score') }}</span>
        <strong :key="scoreBump" class="hud__value bx-value tabular" :class="{ 'hud__value--bump': scoreBump > 0 }">{{ formatNumber(run.score) }}</strong>
      </div>
      <div v-if="variant === 'endless'" class="hud__stat bx-panel" :class="{ 'hud__stat--warn': missLimit(run.rows) - run.misses <= 1 }">
        <span class="bx-label">{{ t('bubbles.play.misses') }}</span>
        <span class="hud__pips" aria-hidden="true">
          <i v-for="n in missLimit(run.rows)" :key="n" :class="{ on: n <= missLimit(run.rows) - run.misses }" />
        </span>
        <strong class="visually-hidden">{{ formatNumber(missLimit(run.rows) - run.misses) }}</strong>
      </div>
      <div v-else-if="variant === 'time'" class="hud__stat bx-panel" :class="{ 'hud__stat--warn': dropIn <= 3 && clockStarted }">
        <span class="bx-label">{{ t('bubbles.play.drop') }}</span>
        <strong class="hud__value bx-value tabular">{{ t('bubbles.play.seconds', { n: dropIn }) }}</strong>
      </div>
      <div v-else class="hud__stat bx-panel" :class="{ 'hud__stat--warn': run.shotsLeft <= 3 }">
        <span class="bx-label">{{ t('bubbles.play.shots') }}</span>
        <strong class="hud__value bx-value tabular">{{ formatNumber(run.shotsLeft) }}</strong>
      </div>
      <div v-if="variant !== 'levels'" class="hud__stat bx-panel">
        <span class="bx-label">{{ t('bubbles.play.best') }}</span>
        <strong class="hud__value bx-value tabular">{{ formatNumber(bestScore) }}</strong>
      </div>
      <div v-else class="hud__stat bx-panel">
        <span class="bx-label">{{ t('bubbles.result.level') }}</span>
        <strong class="hud__value bx-value tabular">{{ formatNumber(run.level) }}</strong>
      </div>
    </section>

    <BubblesGoal v-if="run.goal" :run="run" :symbols="bubblesSettings.symbols" />

    <div class="board-wrap" :class="{ 'board-wrap--goal': run.goal }">
      <BubblesBoard
        v-model:angle="angle"
        :cells="view.cells"
        :parity="view.parity"
        :marked="view.marked"
        :current="run.current"
        :next="run.next"
        :symbols="bubblesSettings.symbols"
        :aim-mode="chosenAimLine"
        :show-aim="keyboardAim"
        :locked="locked"
        :flight="flight"
        :ghosts="ghosts"
        :push-key="pushKey"
        :danger="danger"
        @shoot="onShoot"
        @swap="onSwap"
        @landed="onLanded"
        @tap="onTap"
        @multitouch="pause"
      />
      <p v-if="variant === 'time' && !run.over && (paused || !clockStarted)" class="board-note">
        <span class="bx-panel">{{ paused ? t('bubbles.play.resume') : t('bubbles.play.start') }}</span>
      </p>
      <div class="popups" aria-hidden="true">
        <span v-for="p in popups" :key="p.id" class="popup" :style="{ left: p.left, top: p.top }">
          <strong>{{ p.text }}</strong>
          <small v-if="p.combo">{{ p.combo }}</small>
        </span>
      </div>
      <Transition name="praise">
        <div v-if="praise" :key="praise.id" class="praise" :class="`praise--${praise.word}`" aria-hidden="true">
          {{ t(`bubbles.praise.${praise.word}`) }}
        </div>
      </Transition>
    </div>

    <p class="hint bx-panel">{{ t('bubbles.play.hint') }} · {{ t('bubbles.play.keys') }}</p>
    <p class="visually-hidden" aria-live="polite">{{ summary }}</p>
  </main>

  <AppDialog :open="menuOpen" :title="t('bubbles.pause.title')" @close="menuOpen = false">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="menuOpen = false">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="restart" block @click="requestNew">
        {{ variant === 'levels' ? t('bubbles.pause.restartLevel') : t('bubbles.pause.newGame') }}
      </AppButton>
      <AppButton variant="ghost" icon="back" block @click="toMenu">{{ t('bubbles.pause.quit') }}</AppButton>
    </div>
  </AppDialog>

  <ConfirmDialog
    :open="confirmNew"
    :message="t('bubbles.pause.confirmNew')"
    :confirm-label="t('bubbles.pause.newGame')"
    @confirm="startNew"
    @cancel="confirmNew = false"
  />

  <ResultDialog
    :on-menu="toMenu"
    :menu-label="t('bubbles.result.menu')"
    :on-home="toHome"
    :open="result !== null"
    :title="resultTitle"
    :subtitle="result?.kind === 'lost' ? t('bubbles.result.levelFailedText') : undefined"
    :share="share"
    :stars="result?.kind === 'won' ? result.stars : undefined"
    :icon="result?.kind === 'lost' ? 'restart' : 'trophy'"
    :celebrate="result?.kind === 'won' || (result?.kind === 'over' && result.newBest)"
    :rows="resultRows"
    :badge="result?.kind === 'over' && result.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton v-if="result?.kind === 'won'" variant="primary" block @click="playCurrentLevel">
        {{ t('bubbles.result.nextLevel') }}
      </AppButton>
      <AppButton v-else-if="result?.kind === 'lost'" variant="primary" block @click="playCurrentLevel">
        {{ t('bubbles.result.retry') }}
      </AppButton>
      <AppButton v-else variant="primary" block @click="startNew">{{ t('bubbles.result.playAgain') }}</AppButton>
    </template>
  </ResultDialog>
  <AppDialog :open="showRules" :title="t('bubbles.lobby.howToTitle')" @close="showRules = false">
    <BubblesRules />
  </AppDialog>
</template>

<style src="./console.css"></style>

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
  width: min(100%, 480px);
}

.hud__stat {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 62px;
  padding: var(--space-2);
}

.hud__stat--warn {
  border-color: #ff4d6d;
  box-shadow:
    0 0 14px rgb(255 77 109 / 45%),
    inset 0 0 14px rgb(255 77 109 / 18%);
}

.hud__value {
  font-size: var(--text-xl);
}

.hud__value--bump {
  animation: bump 0.32s var(--ease-emphasized);
}

@keyframes bump {
  40% {
    transform: scale(1.22);
    color: #b6fbff;
  }
}

/* Misses left until a new row: a row of energy cells. */
.hud__pips {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.hud__pips i {
  width: 12px;
  height: 16px;
  border: 1px solid rgb(79 243 255 / 60%);
  background: rgb(79 243 255 / 8%);
}

.hud__pips i.on {
  background: linear-gradient(180deg, #b6fbff, #4ff3ff);
  box-shadow: 0 0 6px #4ff3ff;
}

.hud__stat--warn .hud__pips i.on {
  background: linear-gradient(180deg, #ffc2cf, #ff4d6d);
  box-shadow: 0 0 6px #ff4d6d;
}

.board-wrap {
  --reserved: 230px;

  position: relative;
  /* Width-bound on phones, height-bound on short screens (the board is taller than wide). */
  width: min(
    100%,
    480px,
    calc((100dvh - var(--reserved) - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 0.64)
  );
  min-width: min(100%, 240px);
}

.board-wrap--goal {
  --reserved: 290px;
}

.board-note {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: var(--space-4);
  pointer-events: none;
}

.board-note span {
  max-width: 18em;
  padding: var(--space-2) var(--space-3);
  font-weight: 700;
  text-align: center;
}

.hint {
  margin: 0;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  text-align: center;
  color: #bfefff;
}

/* Points flying up from the impact. */
.popups {
  position: absolute;
  inset: 0;
  z-index: var(--z-board-praise);
  pointer-events: none;
}

.popup {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  font-family: var(--font-mono);
  color: #fff;
  text-shadow:
    0 0 6px #4ff3ff,
    0 0 14px #4ff3ff,
    0 2px 2px rgb(0 0 0 / 60%);
  white-space: nowrap;
  animation: rise 1.05s var(--ease-out) forwards;
}

.popup strong {
  font-size: var(--text-lg);
}

.popup small {
  font-size: var(--text-xs);
  font-weight: 700;
  color: #ffe066;
  text-shadow: 0 0 6px #ff9a1f;
}

@keyframes rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.7);
  }

  15% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1.1);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -260%) scale(1);
  }
}

/* Praise for big drops: a neon word across the field. */
.praise {
  position: absolute;
  top: 38%;
  left: 50%;
  z-index: var(--z-board-praise);
  font-size: clamp(1.8rem, 9vw, 2.6rem);
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  text-shadow:
    0 0 6px var(--praise),
    0 0 18px var(--praise),
    0 0 36px var(--praise),
    0 3px 0 rgb(0 0 0 / 50%);
  white-space: nowrap;
  transform: translate(-50%, -50%);
  pointer-events: none;

  --praise: #4ff3ff;
}

.praise--great {
  --praise: #3dffa8;
}

.praise--stellar {
  --praise: #ffd23f;
}

.praise--supernova,
.praise--cleared {
  --praise: #ff5ad0;
}

.praise-enter-active {
  animation: praise-in 0.42s var(--ease-emphasized);
}

.praise-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.praise-leave-to {
  opacity: 0;
  transform: translate(-50%, -90%) scale(1.1);
}

@keyframes praise-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) skewX(-12deg);
  }

  60% {
    transform: translate(-50%, -50%) scale(1.15);
  }
}

:root[data-motion='reduced'] .popup,
:root[data-motion='reduced'] .hud__value--bump,
:root[data-motion='reduced'] .praise-enter-active {
  animation: none;
}

:root[data-motion='reduced'] .popups {
  display: none;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
