<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, type ComponentPublicInstance } from 'vue'

import { t } from '@/core/i18n'
import { gameLayout, moveGame, orderedGames, setGameEnabled } from '@/games/layout'
import type { GameId } from '@/games/types'
import AppIcon from './AppIcon.vue'
import GameArt from './GameArt.vue'

/**
 * Settings list to enable/disable games and change their order by drag & drop
 * (pointer events on the handle – mouse and touch). Keyboard: arrow keys on the handle.
 */

const listComponent = ref<ComponentPublicInstance | null>(null)
/** The rendered <ul> of the TransitionGroup. */
const listEl = (): HTMLElement | null => (listComponent.value?.$el as HTMLElement | undefined) ?? null
const announcement = ref('')

const enabledCount = computed(
  () => gameLayout.value.order.length - gameLayout.value.disabled.length,
)
const isEnabled = (id: GameId) => !gameLayout.value.disabled.includes(id)
const indexOf = (id: GameId) => gameLayout.value.order.indexOf(id)

function announce(id: GameId): void {
  announcement.value = t('settings.gameMoved', {
    game: t(`${id}.name`),
    position: indexOf(id) + 1,
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
  event.preventDefault()
  drag.value = {
    id,
    pointerId: event.pointerId,
    grabOffset: event.clientY - row.getBoundingClientRect().top,
    rowHeight: el.getBoundingClientRect().height / gameLayout.value.order.length,
    startIndex: indexOf(id),
  }
  dragOffset.value = 0
}

function onHandleMove(event: PointerEvent): void {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) return
  const count = gameLayout.value.order.length
  const rowTop = event.clientY - current.grabOffset
  const listTop = slotTop(0)
  // The slot whose centre the dragged row's centre is closest to.
  const target = Math.max(
    0,
    Math.min(count - 1, Math.round((rowTop - listTop) / current.rowHeight)),
  )
  if (target !== indexOf(current.id)) moveGame(current.id, target)
  dragOffset.value = rowTop - slotTop(indexOf(current.id))
}

function onHandleUp(event: PointerEvent): void {
  const current = drag.value
  if (!current || event.pointerId !== current.pointerId) return
  window.removeEventListener('pointermove', onHandleMove)
  window.removeEventListener('pointerup', onHandleUp)
  window.removeEventListener('pointercancel', onHandleUp)
  drag.value = null
  dragOffset.value = 0
  if (indexOf(current.id) !== current.startIndex) announce(current.id)
}

// --- Keyboard --------------------------------------------------------------------

async function onHandleKey(event: KeyboardEvent, id: GameId): Promise<void> {
  const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
  if (delta === 0) return
  event.preventDefault()
  const target = indexOf(id) + delta
  if (target < 0 || target >= gameLayout.value.order.length) return
  moveGame(id, target)
  announce(id)
  await nextTick()
  listEl()?.querySelector<HTMLElement>(`[data-game="${id}"] .order__handle`)?.focus()
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onHandleMove)
  window.removeEventListener('pointerup', onHandleUp)
  window.removeEventListener('pointercancel', onHandleUp)
})

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
        v-for="game in orderedGames"
        :key="game.id"
        :data-game="game.id"
        class="order__row"
        :class="{ 'order__row--dragging': drag?.id === game.id, 'order__row--off': !isEnabled(game.id) }"
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
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  transition: none !important;
}

.order__row--off .order__art,
.order__row--off .order__name {
  opacity: 0.45;
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
  border-radius: var(--radius-sm);
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
  width: 46px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-surface-3);
  transition: background-color var(--dur-fast);
}

.order__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease-out);
}

.order__switch input:checked + .order__track {
  background: var(--color-accent);
}

.order__switch input:checked + .order__track::after {
  transform: translateX(18px);
}

.order__switch input:disabled + .order__track {
  opacity: 0.55;
}

.order__switch input:focus-visible + .order__track {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
