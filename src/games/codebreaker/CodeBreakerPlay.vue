<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import { showToast } from '@/core/toast'
import CodeBreakerRules from './CodeBreakerRules.vue'
import CodePeg from './CodePeg.vue'
import { DIFFICULTIES, SAVE_KEY, sizeLabel, type Difficulty } from './index'
import { consistentGuess, generatePuzzle, isConsistent, isValidGuess, possibleCodes, score } from './logic/logic'
import { PARAMS, isCodeSave, type CodePuzzle, type CodeSave } from './logic/types'
import { codeBreakerSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'playing' | 'won' | 'lost'

const status = ref<Status>('playing')
const game = ref<CodeSave | null>(null)
const stopwatch = useStopwatch(0)
const selectedSlot = ref<number | null>(0)
const rowsEl = ref<HTMLElement | null>(null)

const params = computed(() => (game.value ? PARAMS[game.value.puzzle.difficulty] : PARAMS.easy))
const guessesLeft = computed(() => (game.value ? params.value.guesses - game.value.guesses.length : 0))
const levelLabel = computed(() =>
  game.value
    ? t('codebreaker.variantLabel', {
        difficulty: t(`difficulty.${game.value.puzzle.difficulty}`),
        size: sizeLabel(game.value.puzzle.difficulty),
      })
    : '',
)

const rows = computed(() =>
  (game.value?.guesses ?? []).map((guess, index) => {
    const feedback = score(game.value!.puzzle.code, guess)
    const dots = Array.from({ length: params.value.positions }, (_, i) =>
      i < feedback.exact ? 'exact' : i < feedback.exact + feedback.partial ? 'partial' : 'none',
    )
    return { index, guess, feedback, dots }
  }),
)

const possible = computed(() =>
  game.value && codeBreakerSettings.value.showPossible ? possibleCodes(game.value.puzzle, game.value.guesses) : null,
)

const complete = computed(() => game.value?.current.every((color) => color !== null) ?? false)
const contradicts = computed(() => {
  const g = game.value
  if (!g || !codeBreakerSettings.value.checkGuesses || !complete.value) return false
  return !isConsistent(g.current as number[], g.guesses, g.puzzle.code)
})

/** Read out by screen readers after each guess (the new row is not focused). */
const announcement = computed(() => {
  const last = rows.value.at(-1)
  return last
    ? `${t('codebreaker.play.row', { n: last.index + 1 })}: ${t('codebreaker.play.feedback', { ...last.feedback })}`
    : ''
})

const colorName = (color: number) => t(`codebreaker.colorNames.c${color}` as 'codebreaker.colorNames.c0')

function rowLabel(guess: readonly number[], index: number): string {
  return `${t('codebreaker.play.row', { n: index + 1 })}: ${guess.map(colorName).join(', ')}`
}

// --- Persistence ------------------------------------------------------------------

let started = false

function persist(): void {
  const g = game.value
  if (!g || status.value !== 'playing' || !started) return
  save(SAVE_KEY, { ...toRaw(g), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

let autosave: ReturnType<typeof setInterval> | undefined
let resultTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)
  window.addEventListener('keydown', onKeydown)
  autosave = setInterval(persist, 5000)
})

onBeforeUnmount(() => {
  persist()
  clearInterval(autosave)
  clearTimeout(resultTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', persist)
  window.removeEventListener('keydown', onKeydown)
})

// --- Starting / resuming ------------------------------------------------------------

function fresh(puzzle: CodePuzzle): CodeSave {
  const { positions } = PARAMS[puzzle.difficulty]
  return { puzzle, guesses: [], current: new Array<number | null>(positions).fill(null), elapsedMs: 0, hintsUsed: 0 }
}

function startNew(difficulty: Difficulty): void {
  remove(SAVE_KEY)
  void router.replace({ name: 'codebreaker-play' })
  game.value = fresh(generatePuzzle(difficulty, randomSeed()))
  selectedSlot.value = 0
  result.value = null
  showResult.value = false
  started = false
  status.value = 'playing'
  stopwatch.reset(0)
  stopwatch.start()
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isCodeSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  started = true
  const firstEmpty = saved.current.indexOf(null)
  selectedSlot.value = firstEmpty >= 0 ? firstEmpty : null
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  scrollToEnd()
  return true
}

function markStarted(g: CodeSave): void {
  if (started) return
  started = true
  recordStart('codebreaker', g.puzzle.difficulty)
}

// --- Entering a guess --------------------------------------------------------------

function pickColor(color: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  const slot = selectedSlot.value ?? g.current.indexOf(null)
  if (slot < 0) return
  g.current = g.current.map((c, i) => (i === slot ? color : c))
  // Continue with the next empty slot to the right, then from the start.
  const after = g.current.findIndex((c, i) => i > slot && c === null)
  const next = after >= 0 ? after : g.current.indexOf(null)
  selectedSlot.value = next >= 0 ? next : null
  persist()
}

function tapSlot(slot: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  if (selectedSlot.value === slot && g.current[slot] !== null) {
    g.current = g.current.map((c, i) => (i === slot ? null : c))
    persist()
  }
  selectedSlot.value = slot
}

function clear(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  g.current = g.current.map(() => null)
  selectedSlot.value = 0
  persist()
}

function clearLast(): void {
  const g = game.value
  if (!g) return
  let last = g.current.length - 1
  while (last >= 0 && g.current[last] === null) last--
  if (last < 0) return
  g.current = g.current.map((c, i) => (i === last ? null : c))
  selectedSlot.value = last
  persist()
}

function scrollToEnd(): void {
  void nextTick(() => {
    const el = rowsEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function submit(): void {
  const g = game.value
  if (!g || status.value !== 'playing' || !complete.value) return
  if (!isValidGuess(g.current, g.puzzle.difficulty)) {
    showToast(t('codebreaker.play.repeatsNotAllowed'))
    return
  }
  const guess = [...g.current] as number[]
  markStarted(g)
  g.guesses = [...g.guesses, guess]
  g.current = g.current.map(() => null)
  selectedSlot.value = 0
  scrollToEnd()
  if (score(g.puzzle.code, guess).exact === params.value.positions) win()
  else if (g.guesses.length >= params.value.guesses) lose()
  else persist()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || status.value !== 'playing') return
  const target = event.target as HTMLElement | null
  if (target?.closest('dialog, input, textarea')) return
  const n = Number(event.key)
  if (Number.isInteger(n) && n >= 1 && n <= params.value.colors) {
    event.preventDefault()
    pickColor(n - 1)
  } else if (event.key === 'Backspace') {
    event.preventDefault()
    clearLast()
  } else if (event.key === 'Enter' && complete.value && !target?.closest('button')) {
    event.preventDefault()
    submit()
  }
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  markStarted(g)
  g.current = consistentGuess(g.puzzle, g.guesses, randomSeed())
  g.hintsUsed += 1
  selectedSlot.value = null
  showToast(t('codebreaker.play.hintFilled'))
  persist()
}

// --- New code ------------------------------------------------------------------------

const confirmRestart = ref(false)

function confirmedRestart(): void {
  confirmRestart.value = false
  startNew(game.value?.puzzle.difficulty ?? 'easy')
}

// --- End -------------------------------------------------------------------------------

const result = ref<{ timeMs: number; newBest: boolean } | null>(null)
const showResult = ref(false)

function win(): void {
  const g = game.value
  if (!g) return
  stopwatch.pause()
  status.value = 'won'
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('codebreaker', g.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  resultTimer = setTimeout(() => (showResult.value = true), motionEnabled.value ? 700 : 0)
}

function lose(): void {
  stopwatch.pause()
  status.value = 'lost'
  remove(SAVE_KEY)
  result.value = { timeMs: Math.round(stopwatch.elapsedMs.value), newBest: false }
  resultTimer = setTimeout(() => (showResult.value = true), motionEnabled.value ? 700 : 0)
}

const resultRows = computed(() => {
  const g = game.value
  if (!g || !result.value) return []
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${g.puzzle.difficulty}`) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('codebreaker.result.guesses'), value: `${g.guesses.length} / ${params.value.guesses}` },
    { label: t('common.hints'), value: String(g.hintsUsed) },
  ]
})

function playAgain(): void {
  showResult.value = false
  startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'codebreaker' })
}

function goHome(): void {
  showResult.value = false
  void returnTo(router, { name: 'home' })
}

const showRules = ref(false)

watch(
  () => route.query.new,
  (value) => {
    if (typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)) {
      startNew(value as Difficulty)
    }
  },
  { immediate: true },
)

if (typeof route.query.new !== 'string' && !resume()) {
  void router.replace({ name: 'codebreaker' })
}
</script>

<template>
  <AppBar :title="t('codebreaker.name')" back-to="/codebreaker">
    <template #actions>
      <span class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('codebreaker.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main
    v-if="game"
    class="play"
    :style="{
      '--positions': params.positions,
      '--dot-cols': Math.ceil(params.positions / 2),
      '--palette-cols': params.colors <= 6 ? params.colors : Math.ceil(params.colors / 2),
    }"
  >
    <div class="hud tabular">
      <div class="hud__item">
        <span class="hud__label">{{ t('common.difficulty') }}</span>
        <span class="hud__value hud__value--level">{{ levelLabel }}</span>
      </div>
      <div class="hud__item">
        <span class="hud__label">{{ t('codebreaker.play.guessesLeft') }}</span>
        <span class="hud__value">{{ guessesLeft }}</span>
      </div>
      <div v-if="possible !== null" class="hud__item">
        <span class="hud__label">{{ t('codebreaker.play.possible') }}</span>
        <span class="hud__value">{{ possible }}</span>
      </div>
    </div>

    <div class="secret" role="group" :aria-label="t('codebreaker.play.secret')">
      <span
        v-for="(color, i) in game.puzzle.code"
        :key="i"
        class="secret__peg"
        role="img"
        :aria-label="status === 'playing' ? t('codebreaker.play.hidden') : colorName(color)"
      >
        <CodePeg :color="color" :hidden="status === 'playing'" />
      </span>
    </div>

    <ol ref="rowsEl" class="rows">
      <li v-for="row in rows" :key="row.index" class="row" :aria-label="rowLabel(row.guess, row.index)">
        <span class="row__n" aria-hidden="true">{{ row.index + 1 }}</span>
        <span v-for="(color, i) in row.guess" :key="i" class="row__peg" aria-hidden="true">
          <CodePeg :color="color" />
        </span>
        <span
          class="dots"
          role="img"
          :aria-label="t('codebreaker.play.feedback', { exact: row.feedback.exact, partial: row.feedback.partial })"
        >
          <span v-for="(dot, i) in row.dots" :key="i" class="dot" :class="`dot--${dot}`" />
        </span>
      </li>
      <li v-if="status === 'playing'" class="row row--current" :class="{ 'row--contradicts': contradicts }">
        <span class="row__n" aria-hidden="true">{{ game.guesses.length + 1 }}</span>
        <button
          v-for="(color, i) in game.current"
          :key="i"
          type="button"
          class="row__peg slot"
          :class="{ 'slot--selected': selectedSlot === i }"
          :aria-label="`${t('codebreaker.play.slot', { n: i + 1 })}: ${color === null ? t('codebreaker.play.emptySlot') : colorName(color)}`"
          :aria-pressed="selectedSlot === i"
          @click="tapSlot(i)"
        >
          <CodePeg :color="color" />
        </button>
        <span class="dots" aria-hidden="true" />
      </li>
    </ol>
    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
    <p v-if="contradicts" class="warning" role="status">{{ t('codebreaker.play.contradicts') }}</p>

    <div class="palette" role="group" :aria-label="t('codebreaker.play.colors')">
      <button
        v-for="c in params.colors"
        :key="c"
        type="button"
        class="palette__btn"
        :aria-label="colorName(c - 1)"
        :disabled="status !== 'playing'"
        @click="pickColor(c - 1)"
      >
        <CodePeg :color="c - 1" />
      </button>
    </div>

    <div class="toolbar">
      <AppButton
        class="toolbar__icon"
        icon="eraser"
        :disabled="status !== 'playing'"
        :aria-label="t('codebreaker.play.clear')"
        :title="t('codebreaker.play.clear')"
        @click="clear"
      />
      <AppButton
        class="toolbar__icon"
        icon="hint"
        :disabled="status !== 'playing'"
        :aria-label="t('common.hint')"
        :title="t('common.hint')"
        @click="requestHint"
      />
      <AppButton variant="primary" icon="check" :disabled="status !== 'playing' || !complete" @click="submit">
        {{ t('codebreaker.play.guess') }}
      </AppButton>
      <AppButton
        class="toolbar__icon"
        icon="restart"
        :disabled="status !== 'playing'"
        :aria-label="t('codebreaker.play.restart')"
        :title="t('codebreaker.play.restart')"
        @click="confirmRestart = true"
      />
    </div>
  </main>

  <AppDialog :open="showRules" :title="t('codebreaker.rules.title')" @close="showRules = false">
    <CodeBreakerRules />
  </AppDialog>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('codebreaker.play.restartConfirm')"
    :confirm-label="t('codebreaker.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showResult"
    :title="status === 'won' ? t('common.solved') : t('codebreaker.result.lostTitle')"
    :subtitle="status === 'won' ? t('codebreaker.result.solvedText') : t('codebreaker.result.lostText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
    :icon="status === 'won' ? 'trophy' : 'restart'"
  >
    <template #actions>
      <AppButton variant="primary" block @click="playAgain">
        {{ status === 'won' ? t('common.newGame') : t('codebreaker.result.newCode') }}
      </AppButton>
      <AppButton block @click="goToMenu">{{ t('codebreaker.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.play {
  --peg: min(36px, calc((100vw - 120px) / var(--positions)));

  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  max-width: var(--content-max);
  min-height: 0;
  margin: 0 auto;
  padding: var(--space-1) max(var(--space-3), env(safe-area-inset-right))
    max(var(--space-3), env(safe-area-inset-bottom)) max(var(--space-3), env(safe-area-inset-left));
}

.timer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  font-weight: 600;
  color: var(--color-text-muted);
}

.hud {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}

.hud__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
}

.hud__label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud__value {
  font-size: var(--text-lg);
  font-weight: 800;
  line-height: 28px;
}

.hud__value--level {
  font-size: var(--text-md);
  color: var(--game-codebreaker);
}

.secret {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
}

.secret__peg {
  width: var(--peg);
  height: var(--peg);
}

.rows {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: none;
  padding: 3px 0;
}

.row--current {
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.row--contradicts {
  box-shadow: inset 0 0 0 2px var(--color-warning);
}

.row__n {
  width: 20px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-align: right;
  color: var(--color-text-muted);
}

.row__peg {
  width: var(--peg);
  height: var(--peg);
}

.slot {
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.slot--selected {
  outline: 3px solid var(--color-accent);
  outline-offset: 1px;
}

.dots {
  display: grid;
  grid-template-columns: repeat(var(--dot-cols), 10px);
  gap: 3px;
  width: 44px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot--exact {
  background: var(--color-text);
}

.dot--partial {
  border: 2px solid var(--color-text);
}

.dot--none {
  background: var(--color-surface-3);
}

.warning {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text);
}

.palette {
  /* Up to six colours in one row, more in two even rows (44 px buttons on a 360 px screen). */
  display: grid;
  grid-template-columns: repeat(var(--palette-cols), var(--tap-min));
  justify-content: center;
  gap: var(--space-1) var(--space-2);
}

.palette__btn {
  width: var(--tap-min);
  height: var(--tap-min);
  padding: 2px;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  touch-action: manipulation;
}

.palette__btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.toolbar {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  width: 100%;
}

.toolbar > * {
  flex: 1;
  max-width: 200px;
  white-space: nowrap;
}

.toolbar > .toolbar__icon {
  flex: none;
  width: var(--tap-min);
  padding: 0;
}
</style>
