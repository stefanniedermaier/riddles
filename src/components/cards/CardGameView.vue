<script setup lang="ts" generic="S, M, V extends string">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { idOf, isUp } from '@/core/cards/cards'
import { HINT_COST, UNDO_COST, WIN_BONUS, replay, timeBonus } from '@/core/cards/game'
import { formatDuration, formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import { showToast } from '@/core/toast'
import CardTable from './CardTable.vue'
import { cardWidth } from './sizing'
import type { CardGameDef } from './types'

/**
 * The play view shared by all card games: dealing, moves (tap, drag, select), automatic
 * moves, undo, hints from the solver, time or points, saving and the result dialogs.
 */
const props = defineProps<{ game: CardGameDef<S, M, V> }>()

const route = useRoute()
const router = useRouter()

interface Save {
  seed: number
  variant: V
  moves: M[]
  /** Length of `moves` after each player action (undo goes back one action). */
  marks: number[]
  undos: number
  hintsUsed: number
  elapsedMs: number
}

const saveKey = computed(() => `${props.game.id}:current:v1`)
const settings = props.game.settings

type Status = 'loading' | 'playing' | 'won' | 'lost'
const status = ref<Status>('loading')
const run = ref(null) as Ref<Save | null>
const state = shallowRef<S | null>(null)
const movePoints = ref(0)
const stopwatch = useStopwatch(0)
const selected = ref<{ pile: string; index: number } | null>(null)
const announcement = ref('')

const pointsMode = computed(() => settings.value.scoring === 'points')
const deck = computed(() => (run.value ? props.game.deck(run.value.variant) : []))

// The table area's size decides between the normal and the wide (landscape) layout: the
// wide one is used when it gives clearly larger cards. Card sizes only depend on where the
// piles are, not on the cards in them, so the choice stays put during a game.
const tableArea = ref<HTMLElement | null>(null)
const area = ref({ width: 0, height: 0 })
let areaObserver: ResizeObserver | null = null
watch(tableArea, (el) => {
  areaObserver?.disconnect()
  areaObserver = null
  if (!el) return
  const measure = () => {
    area.value = { width: el.clientWidth, height: el.clientHeight }
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    areaObserver = new ResizeObserver(measure)
    areaObserver.observe(el)
  }
})
const wide = computed(() => {
  const current = state.value
  const wideColumns = props.game.wideColumns
  const { width, height } = area.value
  if (!current || !wideColumns || width <= 0 || height <= 0) return false
  const normal = cardWidth(props.game.layout(current, false), props.game.columns, width, height)
  return cardWidth(props.game.layout(current, true), wideColumns, width, height) > normal * 1.05
})
const columns = computed(() => (wide.value ? props.game.wideColumns! : props.game.columns))
const piles = computed(() => (state.value ? props.game.layout(state.value, wide.value) : []))
const actions = computed(() => run.value?.marks.length ?? 0)

const winExtra = computed(() =>
  status.value === 'won' && state.value
    ? WIN_BONUS + timeBonus(stopwatch.elapsedMs.value) + (props.game.winPoints?.(state.value) ?? 0)
    : 0,
)
const score = computed(() => {
  const g = run.value
  if (!g) return 0
  const raw = (props.game.startPoints ?? 0) + movePoints.value - g.undos * UNDO_COST - g.hintsUsed * HINT_COST
  return Math.max(0, raw) + winExtra.value
})

const hud = computed(() => (state.value ? props.game.hud(state.value) : []))
const finishMoves = computed(() =>
  status.value === 'playing' && state.value && props.game.autoFinish ? props.game.autoFinish(state.value) : null,
)

// --- Persistence ------------------------------------------------------------------

function isSave(raw: unknown): raw is Save {
  if (typeof raw !== 'object' || raw === null) return false
  const s = raw as Partial<Save>
  const int = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0
  return (
    int(s.seed) &&
    props.game.rules.variants.includes(s.variant as V) &&
    Array.isArray(s.moves) &&
    s.moves.every((m) => props.game.rules.isMove(m)) &&
    Array.isArray(s.marks) &&
    s.marks.every((m, i) => int(m) && m <= s.moves!.length && (i === 0 || m >= s.marks![i - 1]!)) &&
    int(s.undos) &&
    int(s.hintsUsed) &&
    typeof s.elapsedMs === 'number'
  )
}

function persist(): void {
  const g = run.value
  // Saved only once the player did something in this attempt.
  if (!g || status.value !== 'playing' || !started) return
  save(saveKey.value, { ...toRaw(g), moves: toRaw(g.moves), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

let autosave: ReturnType<typeof setInterval> | undefined
const timers = new Set<ReturnType<typeof setTimeout>>()
function later(fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)
  window.addEventListener('keydown', onKeydown)
  autosave = setInterval(persist, 5000)
})

onBeforeUnmount(() => {
  areaObserver?.disconnect()
  startToken++
  persist()
  clearInterval(autosave)
  for (const id of timers) clearTimeout(id)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', persist)
  window.removeEventListener('keydown', onKeydown)
})

// --- Starting ------------------------------------------------------------------------

let startToken = 0
let started = false

function rebuild(g: Save): boolean {
  const result = replay(props.game.rules, g.variant, g.seed, g.moves)
  if (!result) return false
  state.value = result.state
  movePoints.value = result.points
  return true
}

function begin(g: Save, elapsed = 0): void {
  run.value = g
  rebuild(g)
  selected.value = null
  hint.value = null
  hintPlan = []
  showResult.value = false
  status.value = 'playing'
  stopwatch.reset(elapsed)
  stopwatch.start()
}

async function startNew(variant: V): Promise<void> {
  const token = ++startToken
  status.value = 'loading'
  remove(saveKey.value)
  void router.replace({ name: `${props.game.id}-play` })
  const seed = await props.game.deal(variant, settings.value.solvable)
  if (token !== startToken) return
  started = false
  begin({ seed, variant, moves: [], marks: [], undos: 0, hintsUsed: 0, elapsedMs: 0 })
}

function restartDeal(): void {
  const g = run.value
  if (!g) return
  remove(saveKey.value)
  started = false
  begin({ ...g, moves: [], marks: [], undos: 0, hintsUsed: 0, elapsedMs: 0 })
}

function resume(): boolean {
  const saved = load(saveKey.value, null, (raw) => (isSave(raw) ? raw : undefined))
  if (!saved || !replay(props.game.rules, saved.variant, saved.seed, saved.moves)) return false
  started = true
  begin(saved, saved.elapsedMs)
  return true
}

// --- Playing -----------------------------------------------------------------------

function markStarted(g: Save): void {
  if (started) return
  started = true
  recordStart(props.game.id, g.variant)
}

/** Plays one player move and the automatic moves after it. */
function play(move: M): boolean {
  const g = run.value
  const current = state.value
  if (!g || !current || status.value !== 'playing') return false
  const first = props.game.rules.apply(current, move)
  if (!first) return false
  markStarted(g)
  announcement.value = props.game.describe(current, move)
  const moves = [...g.moves, move]
  let next = first.state
  let points = movePoints.value + first.points
  if (props.game.autoMoves) {
    for (const auto of props.game.autoMoves(next, settings.value)) {
      const applied = props.game.rules.apply(next, auto)
      if (!applied) break
      moves.push(auto)
      next = applied.state
      points += applied.points
    }
  }
  // Walk along the hint plan while the played moves follow it; anything else drops it.
  let plan = hintPlan
  for (const played of moves.slice(g.moves.length)) {
    if (plan.length && JSON.stringify(plan[0]) === JSON.stringify(played)) plan = plan.slice(1)
    else {
      plan = []
      break
    }
  }
  hintPlan = plan
  g.moves = moves
  g.marks = [...g.marks, moves.length]
  state.value = next
  movePoints.value = points
  selected.value = null
  hint.value = null
  afterMove()
  return true
}

function afterMove(): void {
  const current = state.value
  if (!current) return
  if (props.game.rules.isWon(current)) {
    win()
    return
  }
  if (props.game.rules.solverMoves(current).length === 0) {
    if (props.game.endsWhenStuck) {
      lose()
      return
    }
    showToast(t('cards.play.noMoves'))
  }
  persist()
}

function onTap(pile: string, index: number): void {
  const current = state.value
  if (!current || status.value !== 'playing') return
  if (!settings.value.tapAuto && pile !== 's') {
    const sel = selected.value
    if (sel) {
      if (sel.pile === pile) {
        selected.value = null
        return
      }
      const move = props.game.dropMove(current, sel.pile, sel.index, pile)
      selected.value = null
      if (!move || !play(move)) showToast(t('cards.play.notAllowed'))
      return
    }
    if (props.game.canPick(current, pile, index)) {
      selected.value = { pile, index }
      const slot = piles.value.find((p) => p.id === pile)?.slots[index]
      if (slot !== undefined && isUp(slot)) announcement.value = t('cards.selected', { card: cardName(idOf(slot)) })
    }
    return
  }
  const move = props.game.tapMove(current, pile, index)
  if (move) play(move)
}

function onDrop(from: string, index: number, to: string): void {
  const current = state.value
  if (!current) return
  const move = props.game.dropMove(current, from, index, to)
  if (!move || !play(move)) showToast(t('cards.play.notAllowed'))
}

function cardName(id: number): string {
  const card = deck.value[id]
  return card
    ? t('cards.card', {
        rank: t(`cards.ranks.r${card.rank}` as 'cards.ranks.r1'),
        suit: t(`cards.suits.s${card.suit}` as 'cards.suits.s0'),
      })
    : ''
}

const canUndo = computed(() => status.value === 'playing' && actions.value > 0)

function undo(): void {
  const g = run.value
  if (!g || !canUndo.value) return
  const marks = g.marks.slice(0, -1)
  g.moves = g.moves.slice(0, marks.length ? marks[marks.length - 1]! : 0)
  g.marks = marks
  g.undos += 1
  hint.value = null
  hintPlan = []
  selected.value = null
  rebuild(g)
  persist()
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey && (event.target as HTMLElement | null)?.closest?.('.card-table')) {
    if (event.key.toLowerCase() === 'u') undo()
    else if (event.key.toLowerCase() === 'd') onTap('s', 0)
  }
}

function finish(): void {
  const moves = finishMoves.value
  if (!moves) return
  const step = (i: number) => {
    if (i >= moves.length || status.value !== 'playing') return
    play(moves[i]!)
    later(() => step(i + 1), motionEnabled.value ? 110 : 0)
  }
  step(0)
}

// --- Hints -----------------------------------------------------------------------------

const hint = ref(null) as Ref<{ move: M; text: string; maybe: boolean } | null>
const thinking = ref(false)
let hintPlan: M[] = []

async function requestHint(): Promise<void> {
  const g = run.value
  const current = state.value
  if (!g || !current || status.value !== 'playing' || thinking.value) return
  selected.value = null
  let plan = hintPlan
  if (!plan.length || !props.game.rules.apply(current, plan[0]!)) {
    thinking.value = true
    const token = startToken
    plan = (await props.game.plan(g.variant, g.seed, toRaw(g.moves)).catch(() => null)) ?? []
    thinking.value = false
    if (token !== startToken || run.value !== g) return
  }
  hintPlan = plan
  let move = plan[0]
  let maybe = false
  if (!move) {
    move = props.game.rules.solverMoves(current)[0]
    maybe = true
  }
  if (!move) {
    showToast(t('cards.play.noMoves'))
    return
  }
  markStarted(g)
  g.hintsUsed += 1
  hint.value = { move, text: props.game.describe(current, move), maybe }
  persist()
}

function applyHint(): void {
  const h = hint.value
  if (!h) return
  play(h.move)
}

const hintPiles = computed(() => (hint.value ? props.game.pilesOf(hint.value.move) : null))

// --- Restart / new deal -----------------------------------------------------------

const confirm = ref<'restart' | 'new' | null>(null)

function confirmed(): void {
  const kind = confirm.value
  confirm.value = null
  if (kind === 'restart') restartDeal()
  else if (kind === 'new') void startNew(run.value?.variant ?? props.game.rules.variants[0]!)
}

// --- End of a game ----------------------------------------------------------------

const result = ref<{ timeMs: number; newBest: boolean; score: number } | null>(null)
const showResult = ref(false)

function win(): void {
  const g = run.value
  if (!g) return
  stopwatch.pause()
  status.value = 'won'
  hint.value = null
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const finalScore = score.value
  const best = recordFinish(props.game.id, g.variant, { timeMs, score: finalScore })
  remove(saveKey.value)
  result.value = { timeMs, score: finalScore, newBest: pointsMode.value ? best.newBestScore : best.newBestTime }
  later(() => (showResult.value = true), motionEnabled.value ? 700 : 0)
}

function lose(): void {
  stopwatch.pause()
  status.value = 'lost'
  hint.value = null
  remove(saveKey.value)
  result.value = { timeMs: Math.round(stopwatch.elapsedMs.value), score: score.value, newBest: false }
  later(() => (showResult.value = true), motionEnabled.value ? 500 : 0)
}

function undoAfterLoss(): void {
  showResult.value = false
  status.value = 'playing'
  stopwatch.start()
  undo()
}

const resultRows = computed(() => {
  const g = run.value
  const r = result.value
  if (!g || !r) return []
  const rows = [{ label: t('common.difficulty'), value: props.game.variantLabel(g.variant), highlight: false }]
  if (pointsMode.value) {
    rows.push({ label: t('cards.result.score'), value: formatNumber(r.score), highlight: r.newBest })
    if (status.value === 'won') {
      rows.push({ label: t('cards.result.bonus'), value: `+${WIN_BONUS}`, highlight: false })
      rows.push({ label: t('cards.result.timeBonus'), value: `+${timeBonus(r.timeMs)}`, highlight: false })
    }
  }
  rows.push({ label: t('common.time'), value: formatDuration(r.timeMs), highlight: !pointsMode.value && r.newBest })
  rows.push({ label: t('cards.result.moves'), value: String(actions.value), highlight: false })
  rows.push({ label: t('common.hints'), value: String(g.hintsUsed), highlight: false })
  return rows
})

function playAgain(): void {
  showResult.value = false
  void startNew(run.value?.variant ?? props.game.rules.variants[0]!)
}

function tryAgain(): void {
  showResult.value = false
  restartDeal()
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: props.game.id })
}

function goHome(): void {
  showResult.value = false
  void returnTo(router, { name: 'home' })
}

const showRules = ref(false)

watch(
  () => route.query.new,
  (value) => {
    if (typeof value === 'string' && props.game.rules.variants.includes(value as V)) void startNew(value as V)
  },
  { immediate: true },
)

if (typeof route.query.new !== 'string' && !resume()) {
  void router.replace({ name: props.game.id })
}
</script>

<template>
  <AppBar :title="t(`${game.id}.name` as 'app.name')" :back-to="`/${game.id}`">
    <template #actions>
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="pointsMode ? t('cards.play.score') : t('common.time')">
        <template v-if="pointsMode">
          <AppIcon name="star" :size="18" />
          {{ formatNumber(score) }}
        </template>
        <template v-else>
          <AppIcon name="clock" :size="18" />
          {{ formatDuration(stopwatch.elapsedMs.value) }}
        </template>
      </span>
      <button type="button" class="icon-btn" :aria-label="t('cards.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play" :style="{ '--card-back': `var(--game-${game.id})`, '--game-text': `var(--game-${game.id})` }">
    <LoadingOverlay v-if="status === 'loading' || !run || !state" :label="t('common.generating')" />

    <template v-else>
      <div class="info" aria-live="polite">
        <p v-if="hint" class="info__hint">
          <strong>{{ t('cards.play.hintTitle') }}:</strong> {{ hint.text }}
          <span v-if="hint.maybe" class="muted">{{ t('cards.play.hintMaybe') }}</span>
        </p>
        <p v-else-if="thinking" class="info__hint muted">{{ t('cards.play.thinking') }}</p>
        <dl v-else class="hud tabular">
          <div>
            <dt>{{ t('common.difficulty') }}</dt>
            <dd class="hud__level">{{ game.variantLabel(run.variant) }}</dd>
          </div>
          <div>
            <dt>{{ t('cards.play.moves') }}</dt>
            <dd>{{ actions }}</dd>
          </div>
          <div v-for="item in hud" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </div>
      <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>

      <div ref="tableArea" class="table-area">
        <CardTable
          :piles="piles"
          :deck="deck"
          :columns="columns"
          :can-pick="(pile: string, index: number) => game.canPick(state!, pile, index)"
          :selected="selected"
          :hint="hintPiles"
          :four-color="settings.fourColor"
          :disabled="status !== 'playing'"
          @tap="onTap"
          @drop="onDrop"
        />
      </div>

      <div v-if="hint" class="toolbar">
        <AppButton class="toolbar__icon" icon="close" :aria-label="t('common.close')" :title="t('common.close')" @click="hint = null" />
        <AppButton variant="primary" @click="applyHint">{{ t('common.apply') }}</AppButton>
      </div>
      <div v-else class="toolbar">
        <AppButton
          class="toolbar__icon"
          icon="undo"
          :disabled="!canUndo"
          :aria-label="t('cards.play.undo')"
          :title="t('cards.play.undo')"
          @click="undo"
        />
        <AppButton
          class="toolbar__icon"
          icon="hint"
          :disabled="status !== 'playing' || thinking"
          :aria-label="t('common.hint')"
          :title="t('common.hint')"
          @click="requestHint"
        />
        <AppButton v-if="finishMoves" variant="primary" icon="check" @click="finish">{{ t('cards.play.autoFinish') }}</AppButton>
        <AppButton
          class="toolbar__icon"
          icon="restart"
          :disabled="status !== 'playing'"
          :aria-label="t('cards.play.restart')"
          :title="t('cards.play.restart')"
          @click="confirm = 'restart'"
        />
        <AppButton
          class="toolbar__icon"
          icon="plus"
          :disabled="status !== 'playing'"
          :aria-label="t('cards.play.newDeal')"
          :title="t('cards.play.newDeal')"
          @click="actions > 0 ? (confirm = 'new') : playAgain()"
        />
      </div>
    </template>
  </main>

  <AppDialog :open="showRules" :title="t('cards.play.rules')" @close="showRules = false">
    <ul class="rules">
      <li v-for="key in game.rulesKeys" :key="key">{{ t(key) }}</li>
    </ul>
  </AppDialog>

  <ConfirmDialog
    :open="confirm !== null"
    :message="confirm === 'restart' ? t('cards.play.restartConfirm') : t('cards.play.newDealConfirm')"
    :confirm-label="confirm === 'restart' ? t('cards.play.restart') : t('cards.play.newDeal')"
    danger
    @confirm="confirmed"
    @cancel="confirm = null"
  />

  <ResultDialog
    :open="showResult"
    :title="status === 'won' ? t('common.solved') : t('cards.result.lostTitle')"
    :subtitle="status === 'won' ? t('cards.result.solvedText') : t('cards.result.lostText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
    :icon="status === 'won' ? 'trophy' : 'restart'"
  >
    <template #actions>
      <template v-if="status === 'won'">
        <AppButton variant="primary" block @click="playAgain">{{ t('common.newGame') }}</AppButton>
        <AppButton block @click="goToMenu">{{ t('cards.play.menu') }}</AppButton>
      </template>
      <template v-else>
        <AppButton variant="primary" icon="undo" block @click="undoAfterLoss">{{ t('cards.play.undo') }}</AppButton>
        <AppButton block @click="tryAgain">{{ t('cards.result.tryAgain') }}</AppButton>
        <AppButton block @click="playAgain">{{ t('cards.play.newDeal') }}</AppButton>
      </template>
      <AppButton variant="ghost" icon="home" block @click="goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.play {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  max-width: 1200px;
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

.info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  flex: none;
}

.info__hint {
  font-size: var(--text-sm);
  text-align: center;
}

.hud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1) var(--space-4);
  margin: 0;
}

.hud div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud dt {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud dd {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 800;
}

.hud .hud__level {
  color: var(--game-text, var(--color-text));
}

.table-area {
  flex: 1 1 0;
  width: 100%;
  min-height: 300px;
  overflow-y: auto;
}

/* Phones in landscape: the toolbar moves beside the table, so the table gets the height. */
@media (orientation: landscape) and (max-height: 540px) {
  .play {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto minmax(0, 1fr);
    align-items: stretch;
    padding-top: 0;
  }

  .info {
    grid-column: 1;
    min-height: 40px;
  }

  .table-area {
    grid-column: 1;
    grid-row: 2;
    min-height: 0;
  }

  .toolbar {
    grid-column: 2;
    grid-row: 1 / span 2;
    flex-direction: column;
    justify-content: center;
    width: auto;
  }

  .toolbar > * {
    flex: none;
  }
}

.toolbar {
  display: flex;
  flex: none;
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

.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}
</style>
