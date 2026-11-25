<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { idOf, isUp, type CardDef } from '@/core/cards/cards'
import { t } from '@/core/i18n'
import PlayingCard from './PlayingCard.vue'
import { CARD_RATIO, cardWidth, gapFor } from './sizing'
import type { PileView } from './types'

/**
 * A card table: piles at grid positions (in card units), fanned columns, drag & drop,
 * taps and keyboard navigation. Cards are keyed by id, so a move animates from the old to
 * the new place.
 */
const props = defineProps<{
  piles: readonly PileView[]
  deck: readonly CardDef[]
  /** Width of the table in card widths. */
  columns: number
  /** Whether the cards from `index` on in `pile` may be picked up. */
  canPick: (pile: string, index: number) => boolean
  /** Picked-up cards (select mode). */
  selected?: { pile: string; index: number } | null
  /** Piles highlighted by a hint. */
  hint?: readonly string[] | null
  fourColor?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  tap: [pile: string, index: number]
  drop: [from: string, index: number, to: string]
}>()

const table = ref<HTMLElement | null>(null)
const size = ref({ width: 360, height: 560 })
let observer: ResizeObserver | null = null

onMounted(() => {
  const el = table.value
  if (!el) return
  // The height comes from the scroll area around the table (the table itself grows with
  // its piles, so its own height would feed back into the card size).
  const area = el.parentElement ?? el
  const measure = () => {
    if (el.clientWidth > 0) size.value = { width: el.clientWidth, height: area.clientHeight || 560 }
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(el)
    if (area !== el) observer.observe(area)
  }
})
onBeforeUnmount(() => observer?.disconnect())

const gap = computed(() => gapFor(props.columns))
const cardW = computed(() => cardWidth(props.piles, props.columns, size.value.width, size.value.height))
const cardH = computed(() => cardW.value * CARD_RATIO)
/** Centres the table when the cards hit their maximum size. */
const offsetX = computed(() =>
  Math.max(0, (size.value.width - props.columns * cardW.value - (props.columns - 1) * gap.value) / 2),
)

interface Placed {
  id: number
  pile: string
  index: number
  x: number
  y: number
  z: number
  up: boolean
}

interface PileBox {
  pile: PileView
  x: number
  y: number
  /** Bottom edge of the fanned pile (for drop zones). */
  bottom: number
}

const layout = computed(() => {
  const w = cardW.value
  const h = cardH.value
  const step = w + gap.value
  const cards: Placed[] = []
  const boxes: PileBox[] = []
  props.piles.forEach((pile, pileIndex) => {
    const x = offsetX.value + pile.x * step
    const y = pile.y * (h + gap.value * 2)
    let bottom = y + h
    if (pile.fan === 'down') {
      // A long column is squeezed to fit the height: face-down cards first, then face-up
      // ones, but only down to the point where the rank in the corner stays readable.
      const room = size.value.height - y - h - 4
      const above = pile.slots.slice(0, -1)
      const downs = above.filter((slot) => !isUp(slot)).length
      const ups = above.length - downs
      let downStep = h * 0.15
      let upStep = h * 0.28
      if (downs * downStep + ups * upStep > room) {
        if (downs) downStep = Math.max(h * 0.05, Math.min(downStep, (room - ups * upStep) / downs))
        if (ups && downs * downStep + ups * upStep > room) upStep = Math.max(h * 0.2, (room - downs * downStep) / ups)
      }
      let offset = 0
      pile.slots.forEach((slot, i) => {
        cards.push({ id: idOf(slot), pile: pile.id, index: i, x, y: y + offset, z: pileIndex * 200 + i, up: isUp(slot) })
        offset += isUp(slot) ? upStep : downStep
      })
      offset -= pile.slots.length ? (isUp(pile.slots.at(-1)!) ? upStep : downStep) : 0
      bottom = y + offset + h
    } else {
      const visible = pile.fan === 'right' ? 3 : 1
      const first = Math.max(0, pile.slots.length - visible)
      pile.slots.forEach((slot, i) => {
        const shift = pile.fan === 'right' && i >= first ? (i - first) * w * 0.28 : 0
        cards.push({ id: idOf(slot), pile: pile.id, index: i, x: x + shift, y, z: pileIndex * 200 + i, up: isUp(slot) })
      })
    }
    boxes.push({ pile, x, y, bottom })
  })
  const height = Math.max(...boxes.map((b) => b.bottom), h) + 4
  return { cards, boxes, height }
})

function cardLabel(id: number): string {
  const card = props.deck[id]
  if (!card) return ''
  return t('cards.card', {
    rank: t(`cards.ranks.r${card.rank}` as 'cards.ranks.r1'),
    suit: t(`cards.suits.s${card.suit}` as 'cards.suits.s0'),
  })
}

/**
 * Labels and hint marks per card, computed once per layout (not per render: during a drag the
 * table re-renders and Spider has 104 cards).
 */
const cardInfo = computed(() => {
  const pileLabels = new Map(props.piles.map((pile) => [pile.id, pile.label]))
  const hinted = new Set(
    props.piles.filter((pile) => props.hint?.includes(pile.id)).map((pile) => `${pile.id}:${pile.slots.length - 1}`),
  )
  const faceDown = t('cards.faceDown')
  return new Map(
    layout.value.cards.map((card) => [
      card.id,
      {
        label: `${pileLabels.get(card.pile) ?? ''}: ${card.up ? cardLabel(card.id) : faceDown}`,
        hint: hinted.has(`${card.pile}:${card.index}`),
      },
    ]),
  )
})

// --- Pointer input ----------------------------------------------------------------------

/**
 * The dragged cards. The pointer offset is not reactive: it goes straight into the CSS
 * variables `--dx` / `--dy` of the table, so a pointer move re-renders nothing.
 */
const drag = ref<{ pile: string; index: number } | null>(null)

function setOffset(dx: number, dy: number): void {
  table.value?.style.setProperty('--dx', `${dx}px`)
  table.value?.style.setProperty('--dy', `${dy}px`)
}
let down: { pile: string; index: number; x: number; y: number; id: number } | null = null

function onCardDown(event: PointerEvent, pile: string, index: number): void {
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
  down = { pile, index, x: event.clientX, y: event.clientY, id: event.pointerId }
  table.value?.setPointerCapture?.(event.pointerId)
}

function onMove(event: PointerEvent): void {
  if (!down || event.pointerId !== down.id) return
  const dx = event.clientX - down.x
  const dy = event.clientY - down.y
  if (!drag.value) {
    if (Math.hypot(dx, dy) < 8 || !props.canPick(down.pile, down.index)) return
    drag.value = { pile: down.pile, index: down.index }
  }
  setOffset(dx, dy)
}

function pileAt(clientX: number, clientY: number): string | null {
  const el = table.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  let best: string | null = null
  let bestDistance = Infinity
  for (const box of layout.value.boxes) {
    const inX = x >= box.x - gap.value && x <= box.x + cardW.value + gap.value
    const inY = y >= box.y - gap.value && y <= box.bottom + cardH.value * 0.5
    if (!inX || !inY) continue
    const distance = Math.abs(x - (box.x + cardW.value / 2))
    if (distance < bestDistance) {
      bestDistance = distance
      best = box.pile.id
    }
  }
  return best
}

function onUp(event: PointerEvent): void {
  if (!down || event.pointerId !== down.id) return
  const start = down
  down = null
  const dragged = drag.value
  drag.value = null
  if (dragged) {
    const to = pileAt(event.clientX, event.clientY)
    if (to && to !== dragged.pile) emit('drop', dragged.pile, dragged.index, to)
    return
  }
  emit('tap', start.pile, start.index)
}

function onCancel(): void {
  down = null
  drag.value = null
}

const isDragged = (card: Placed) =>
  drag.value !== null && card.pile === drag.value.pile && card.index >= drag.value.index

function cardStyle(card: Placed): Record<string, string> {
  const dragged = isDragged(card)
  return {
    width: `${cardW.value}px`,
    height: `${cardH.value}px`,
    transform: dragged
      ? `translate(calc(${card.x}px + var(--dx, 0px)), calc(${card.y}px + var(--dy, 0px)))`
      : `translate(${card.x}px, ${card.y}px)`,
    zIndex: String(dragged ? 10000 + card.index : card.z + 1),
  }
}

function slotStyle(box: PileBox): Record<string, string> {
  return {
    width: `${cardW.value}px`,
    height: `${cardH.value}px`,
    transform: `translate(${box.x}px, ${box.y}px)`,
  }
}

// --- Keyboard: one tab stop, arrow keys move between piles and cards ---------------------

const cursor = ref<{ pile: string; index: number } | null>(null)

/** Positions the keyboard can reach: pickable cards, or the pile itself (index = length). */
const stops = computed(() =>
  props.piles.map((pile) => {
    const indexes = pile.slots.map((_, i) => i).filter((i) => isUp(pile.slots[i]!) && props.canPick(pile.id, i))
    return { pile: pile.id, indexes: indexes.length ? indexes : [Math.max(0, pile.slots.length - 1)] }
  }),
)

function isCursor(pile: string, index: number): boolean {
  const c = cursor.value ?? { pile: props.piles[0]?.id ?? '', index: stops.value[0]?.indexes.at(-1) ?? 0 }
  return c.pile === pile && c.index === index
}

function focusCursor(): void {
  void nextTick(() => table.value?.querySelector<HTMLElement>('[data-cursor="true"]')?.focus())
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const list = stops.value
  if (!list.length) return
  const current = cursor.value ?? { pile: list[0]!.pile, index: list[0]!.indexes.at(-1)! }
  let p = Math.max(0, list.findIndex((s) => s.pile === current.pile))
  let i = list[p]!.indexes.indexOf(current.index)
  if (i < 0) i = list[p]!.indexes.length - 1
  switch (event.key) {
    case 'ArrowRight':
      p = (p + 1) % list.length
      i = list[p]!.indexes.length - 1
      break
    case 'ArrowLeft':
      p = (p - 1 + list.length) % list.length
      i = list[p]!.indexes.length - 1
      break
    case 'ArrowUp':
      i = Math.max(0, i - 1)
      break
    case 'ArrowDown':
      i = Math.min(list[p]!.indexes.length - 1, i + 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      emit('tap', current.pile, current.index)
      return
    default:
      return
  }
  event.preventDefault()
  cursor.value = { pile: list[p]!.pile, index: list[p]!.indexes[i]! }
  focusCursor()
}

watch(
  () => props.piles,
  () => {
    // Keep the cursor on an existing stop after a move.
    const c = cursor.value
    if (!c) return
    const stop = stops.value.find((s) => s.pile === c.pile)
    if (!stop) cursor.value = null
    else if (!stop.indexes.includes(c.index)) cursor.value = { pile: c.pile, index: stop.indexes.at(-1)! }
  },
)

function onFocus(pile: string, index: number): void {
  cursor.value = { pile, index }
}
</script>

<template>
  <div
    ref="table"
    class="card-table no-select"
    :class="{ 'card-table--dragging': drag }"
    role="group"
    :aria-label="t('cards.table')"
    :style="{ height: `${layout.height}px`, '--card-w': `${cardW}px` }"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
    @keydown="onKeydown"
    @contextmenu.prevent
  >
    <button
      v-for="box in layout.boxes"
      :key="`slot-${box.pile.id}`"
      type="button"
      class="slot"
      :class="{ 'slot--hint': hint?.includes(box.pile.id), 'slot--stock': box.pile.id === 's' }"
      :style="slotStyle(box)"
      :aria-label="box.pile.label"
      :tabindex="isCursor(box.pile.id, 0) && box.pile.slots.length === 0 ? 0 : -1"
      :data-cursor="isCursor(box.pile.id, 0) && box.pile.slots.length === 0"
      :data-pile="box.pile.id"
      :disabled="disabled"
      @pointerdown="onCardDown($event, box.pile.id, 0)"
      @focus="onFocus(box.pile.id, 0)"
    >
      <span class="slot__mark" aria-hidden="true">{{ box.pile.placeholder ?? '' }}</span>
    </button>
    <button
      v-for="card in layout.cards"
      :key="card.id"
      type="button"
      class="card"
      :class="{
        'card--dragged': isDragged(card),
        'card--selected': selected && selected.pile === card.pile && card.index >= selected.index,
        'card--hint': cardInfo.get(card.id)?.hint,
      }"
      :style="cardStyle(card)"
      :aria-label="cardInfo.get(card.id)?.label"
      :aria-hidden="!card.up && card.pile !== 's' ? 'true' : undefined"
      :tabindex="isCursor(card.pile, card.index) ? 0 : -1"
      :data-cursor="isCursor(card.pile, card.index)"
      :data-pile="card.pile"
      :data-index="card.index"
      :disabled="disabled"
      @pointerdown="onCardDown($event, card.pile, card.index)"
      @focus="onFocus(card.pile, card.index)"
    >
      <PlayingCard :card="card.up ? (deck[card.id] ?? null) : null" :four-color="fourColor" />
    </button>
  </div>
</template>

<style scoped>
.card-table {
  position: relative;
  /* Keeps the cards' z-indexes inside the table (dialogs stay on top). */
  isolation: isolate;
  width: 100%;
  min-height: 100%;
  touch-action: none;
}

.slot,
.card {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.slot {
  border: 2px dashed color-mix(in srgb, var(--color-text) 35%, transparent);
  border-radius: 6px;
}

.slot--stock {
  border-style: solid;
}

.slot__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: calc(var(--card-w) * 0.4);
  font-weight: 800;
  color: color-mix(in srgb, var(--color-text) 45%, transparent);
}

.card {
  transition: transform 180ms var(--ease-out);
  will-change: transform;
}

.card--dragged {
  transition: none;
  filter: drop-shadow(0 6px 10px rgb(0 0 0 / 25%));
}

.card--selected :deep(.playing-card__face) {
  stroke: var(--color-accent);
  stroke-width: 3;
}

.card--hint :deep(.playing-card__face),
.slot--hint {
  stroke: var(--color-accent);
  stroke-width: 3;
  border-color: var(--color-accent);
}

.card:focus-visible,
.slot:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 1px;
  border-radius: 6px;
}

.card:disabled,
.slot:disabled {
  cursor: default;
}

:root[data-motion='reduced'] .card {
  transition: none;
}
</style>
