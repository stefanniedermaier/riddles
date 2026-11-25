<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, type ComponentPublicInstance } from 'vue'

import { t } from '@/core/i18n'
import { gameLayout, moveGame, orderedGames, setGameEnabled, visibleGames } from '@/games/layout'
import type { GameId } from '@/games/types'
import AppIcon from './AppIcon.vue'
import GameArt from './GameArt.vue'

/**
 * Settings list to enable/disable games and change their order by drag & drop
 * (pointer events on the handle – mouse and touch). Keyboard: arrow keys on the handle.
 *
 * Shown games are listed (and sorted) on top; hidden games move to a second list in a
 * collapsible section below – that keeps the list short. A hidden game keeps its place in
 * the stored order, so showing it again puts it back where it was.
 *
 * The list is taller than many screens: while dragging, the page scrolls by itself when the
 * pointer nears the top or bottom edge, and scrolling with the mouse wheel keeps the row
 * under the pointer (and reorders it).
 */

const listComponent = ref<ComponentPublicInstance | null>(null)
/** The rendered <ul> of the TransitionGroup. */
const listEl = (): HTMLElement | null => (listComponent.value?.$el as HTMLElement | undefined) ?? null
const announcement = ref('')

const enabledCount = computed(
  () => gameLayout.value.order.length - gameLayout.value.disabled.length,
)
const isEnabled = (id: GameId) => !gameLayout.value.disabled.includes(id)
const shownIds = computed(() => visibleGames.value.map((game) => game.id))
const hiddenGames = computed(() => orderedGames.value.filter((game) => !isEnabled(game.id)))
/** Position of a game among the shown games (the sortable list). */
const slotOf = (id: GameId) => shownIds.value.indexOf(id)

/** Moves a shown game to a slot of the shown list (hidden games keep their places). */
function moveToSlot(id: GameId, slot: number): void {
  const other = shownIds.value[slot]
  if (other === undefined || other === id) return
  moveGame(id, gameLayout.value.order.indexOf(other))
}

function announce(id: GameId): void {
  announcement.value = t('settings.gameMoved', {
    game: t(`${id}.name`),
    position: slotOf(id) + 1,
  })
}

// --- Drag & drop -------------------------------------------------------------

interface Drag {
  id: GameId
  pointerId: number
  /** Distance between the pointer and the top edge of the grabbed row. */
  grabOffset: number
  rowHeight: number
  startIndex: number
}

const drag = ref<Drag | null>(null)
/** Vertical offset of the dragged row relative to its current slot. */
const dragOffset = ref(0)
/** Last pointer position during a drag (the page may scroll without the pointer moving). */
let pointerY = 0
let autoScrollFrame = 0

/** A pointer this close to the top/bottom edge (px) scrolls the page – faster nearer the edge. */
const EDGE = 72
const MAX_SPEED = 18

function slotTop(index: number): number {
  const el = listEl()
  if (!el || !drag.value) return 0
  return el.getBoundingClientRect().top + index * drag.value.rowHeight
}

function onHandleDown(event: PointerEvent, id: GameId): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = listEl()
  if (!el) return
  const handle = event.currentTarget as HTMLElement
  const row = handle.closest<HTMLElement>('[data-game]')
  if (!row) return
  // Listen on window rather than relying on pointer capture: reordering moves the row (and
  // with it the handle) in the DOM, which would drop the capture mid-drag.
  window.addEventListener('pointermove', onHandleMove)
  window.addEventListener('pointerup', onHandleUp)
  window.addEventListener('pointercancel', onHandleUp)
  window.addEventListener('scroll', updateDrag, { passive: true })
  event.preventDefault()
  pointerY = event.clientY
  drag.value = {
    id,
    pointerId: event.pointerId,
    grabOffset: event.clientY - row.getBoundingClientRect().top,
    rowHeight: row.getBoundingClientRect().height,
    startIndex: slotOf(id),
  }
  dragOffset.value = 0
  autoScrollFrame = requestAnimationFrame(autoScroll)
}

function onHandleMove(event: PointerEvent): void {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) return
  pointerY = event.clientY
  updateDrag()
}

/** Moves the dragged row to the pointer (after a pointer move or a scroll of the page). */
function updateDrag(): void {
  const current = drag.value
  if (!current) return
  const count = shownIds.value.length
  const rowTop = pointerY - current.grabOffset
  const listTop = slotTop(0)
  // The slot whose centre the dragged row's centre is closest to.
  const target = Math.max(
    0,
    Math.min(count - 1, Math.round((rowTop - listTop) / current.rowHeight)),
  )
  if (target !== slotOf(current.id)) moveToSlot(current.id, target)
  dragOffset.value = rowTop - slotTop(slotOf(current.id))
}

/** Scrolls the page while the pointer is held near the top or bottom edge of the window. */
function autoScroll(): void {
  if (!drag.value) return
  const fromBottom = window.innerHeight - pointerY
  let speed = 0
  if (pointerY < EDGE) speed = -MAX_SPEED * (1 - Math.max(0, pointerY) / EDGE)
  else if (fromBottom < EDGE) speed = MAX_SPEED * (1 - Math.max(0, fromBottom) / EDGE)
  if (speed !== 0) window.scrollBy(0, speed)
  autoScrollFrame = requestAnimationFrame(autoScroll)
}

function stopListening(): void {
  window.removeEventListener('pointermove', onHandleMove)
  window.removeEventListener('pointerup', onHandleUp)
  window.removeEventListener('pointercancel', onHandleUp)
  window.removeEventListener('scroll', updateDrag)
  cancelAnimationFrame(autoScrollFrame)
}

function onHandleUp(event: PointerEvent): void {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) return
  stopListening()
  drag.value = null
  dragOffset.value = 0
  if (slotOf(current.id) !== current.startIndex) announce(current.id)
}

// --- Keyboard --------------------------------------------------------------------

async function onHandleKey(event: KeyboardEvent, id: GameId): Promise<void> {
  const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
  if (delta === 0) return
  event.preventDefault()
  const target = slotOf(id) + delta
  if (target < 0 || target >= shownIds.value.length) return
  moveToSlot(id, target)
  announce(id)
  await nextTick()
  listEl()?.querySelector<HTMLElement>(`[data-game="${id}"] .order__handle`)?.focus()
}

onBeforeUnmount(stopListening)

function rowStyle(id: GameId): Record<string, string> | undefined {
  if (drag.value?.id !== id) return undefined
  return { transform: `translateY(${dragOffset.value}px)` }
}
</script>

<template>
  <div class="order">
    <p class="order__hint">{{ t('settings.gamesHint') }}</p>
    <TransitionGroup ref="listComponent" tag="ul" name="order" class="order__list" :class="{ 'order__list--dragging': drag }">
      <li
        v-for="game in visibleGames"
        :key="game.id"
        :data-game="game.id"
        class="order__row"
        :class="{ 'order__row--dragging': drag?.id === game.id }"
        :style="rowStyle(game.id)"
      >
        <button
          type="button"
          class="order__handle"
          :aria-label="t('settings.gameMove', { game: t(`${game.id}.name`) })"
          @pointerdown="onHandleDown($event, game.id)"
          @keydown="onHandleKey($event, game.id)"
        >
          <AppIcon name="drag" :size="22" />
        </button>
        <GameArt :game="game.id" class="order__art" />
        <span class="order__name">{{ t(`${game.id}.name`) }}</span>
        <label class="order__switch">
          <input
            type="checkbox"
            role="switch"
            :checked="isEnabled(game.id)"
            :disabled="isEnabled(game.id) && enabledCount <= 1"
            :aria-label="t('settings.gameShow', { game: t(`${game.id}.name`) })"
            @change="setGameEnabled(game.id, ($event.target as HTMLInputElement).checked)"
          />
          <span class="order__track" aria-hidden="true" />
        </label>
      </li>
    </TransitionGroup>

    <!-- Hidden games: collapsed by default, switch on to show a game again. -->
    <details v-if="hiddenGames.length" class="order__hidden">
      <summary class="order__hidden-summary">
        <span class="order__hidden-title">{{ t('settings.hiddenGames', { count: hiddenGames.length }) }}</span>
        <AppIcon name="chevronDown" :size="20" class="order__hidden-chevron" />
      </summary>
      <ul class="order__list order__list--hidden">
        <li v-for="game in hiddenGames" :key="game.id" :data-game="game.id" class="order__row order__row--off">
          <span class="order__handle order__handle--none" aria-hidden="true" />
          <GameArt :game="game.id" class="order__art" />
          <span class="order__name">{{ t(`${game.id}.name`) }}</span>
          <label class="order__switch">
            <input
              type="checkbox"
              role="switch"
              :checked="false"
              :aria-label="t('settings.gameShow', { game: t(`${game.id}.name`) })"
              @change="setGameEnabled(game.id, ($event.target as HTMLInputElement).checked)"
            />
            <span class="order__track" aria-hidden="true" />
          </label>
        </li>
      </ul>
    </details>
    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.order__hint {
  padding: var(--space-3) var(--space-4) var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.order__list {
  position: relative;
  margin: 0;
  padding: 0 0 var(--space-2);
  list-style: none;
}

.order__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 60px;
  padding: 0 var(--space-4) 0 var(--space-1);
  background: var(--color-surface);
  user-select: none;
  -webkit-user-select: none;
}

.order__row + .order__row {
  border-top: 1px solid var(--color-border);
}

.order__row--dragging {
  z-index: 2;
  box-shadow: var(--shadow-lg);
  transition: none !important;
}

.order__row--off .order__art,
.order__row--off .order__name {
  opacity: 0.45;
}

/* --- Hidden games (collapsible) ---------------------------------------------------- */

.order__hidden {
  border-top: 1px solid var(--color-border);
}

.order__hidden-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: var(--space-2) var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  list-style: none;
  user-select: none;
  -webkit-user-select: none;
}

.order__hidden-summary::-webkit-details-marker {
  display: none;
}

.order__hidden-title {
  flex: 1;
}

.order__hidden-chevron {
  transition: transform var(--dur-fast) var(--ease-out);
}

.order__hidden[open] .order__hidden-chevron {
  transform: rotate(180deg);
}

.order__list--hidden {
  border-top: 1px dashed var(--color-border);
}

/* Keeps the hidden rows aligned with the sortable ones (no handle there). */
.order__handle--none {
  cursor: default;
}

.order-move {
  transition: transform var(--dur-med) var(--ease-out);
}

.order__handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: grab;
  touch-action: none;
}

.order__list--dragging .order__handle {
  cursor: grabbing;
}

.order__row :deep(.game-art) {
  width: 40px;
  height: 40px;
}

.order__name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
}

.order__switch {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}

.order__switch input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.order__switch input:disabled {
  cursor: not-allowed;
}

.order__track {
  position: relative;
  flex: none;
  box-sizing: border-box;
  width: 52px;
  height: 32px;
  /* Material 3 switch, square (design guide): outlined track and a small thumb when off,
    filled track and a large thumb when on. */
  border: 2px solid color-mix(in srgb, var(--color-text) 45%, transparent);
  border-radius: 0;
  background: var(--color-surface-3);
  transition:
    background-color var(--dur-fast) var(--ease-standard),
    border-color var(--dur-fast) var(--ease-standard);
}

.order__track::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 6px;
  width: 16px;
  height: 16px;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-text) 55%, transparent);
  transform: translateY(-50%);
  transition:
    left var(--dur-med) var(--ease-emphasized),
    width var(--dur-med) var(--ease-emphasized),
    height var(--dur-med) var(--ease-emphasized),
    background-color var(--dur-fast);
}

.order__switch input:checked + .order__track {
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.order__switch input:checked + .order__track::after {
  left: 22px;
  width: 24px;
  height: 24px;
  background: var(--color-on-accent);
}

.order__switch input:disabled + .order__track {
  opacity: 0.38;
}

.order__switch input:focus-visible + .order__track {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
