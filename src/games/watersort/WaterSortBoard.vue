<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { t } from '@/core/i18n'
import { motionEnabled, resolvedTheme } from '@/core/theme'
import { isComplete } from './logic/rules'
import type { Tubes } from './logic/types'
import { colorLabel, shade, symbolColor, waterColor } from './palette'

export interface Pour {
  /** Source tube; when given (a real pour, not an undo), the pour is animated. */
  from?: number
  to: number
  amount: number
  /** Unique per pour (restarts the animation). */
  key: number
}

const props = defineProps<{
  tubes: Tubes
  selected: number | null
  /** Tubes highlighted by a hint. */
  hint?: { from: number; to: number } | null
  /** The last pour (animated). */
  poured?: Pour | null
  /** Tube that refused a pour (shakes). */
  refused?: { tube: number; key: number } | null
  symbols?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ select: [tube: number] }>()

/** At most 7 tubes per row; rows are balanced (14 tubes → 7 + 7, 11 → 6 + 5). */
const perRow = computed(() => Math.ceil(props.tubes.length / Math.ceil(props.tubes.length / 7)))

// --- Pour animation ------------------------------------------------------------------
//
// The game state changes at once; the board shows the tubes as they were before the pour
// (`before`) while the source tube flies over and tilts, then switches to the new state as
// the stream starts – the target fills up, the source empties – and the tube flies back.

/**
 * Timings of one pour (ms): fly over, tilt, pour (one `FILL_MS` per layer – several layers
 * fill up one after the other, from the bottom up), tilt back, fly back.
 */
const FLY_MS = 300
const TILT_MS = 130
const FILL_MS = 300
const BACK_MS = 220

const root = ref<HTMLElement | null>(null)
const before = ref<Record<number, number[]> | null>(null)
const stream = ref<{ key: number; left: number; top: number; height: number; color: string } | null>(null)
const busy = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []

function clearTimers(): void {
  timers.forEach(clearTimeout)
  timers = []
}

function animatePour(pour: Pour): void {
  const { from, to, amount } = pour
  const container = root.value
  if (from === undefined || !container || !motionEnabled.value) return
  const source = container.querySelector<HTMLElement>(`[data-tube="${from}"]`)
  const target = container.querySelector<HTMLElement>(`[data-tube="${to}"]`)
  const targetGlass = target?.querySelector<HTMLElement>('.tube__glass')
  if (!source || !target || !targetGlass || typeof source.animate !== 'function') return

  const after = props.tubes
  const color = after[to]![after[to]!.length - 1]!
  const targetBefore = after[to]!.slice(0, after[to]!.length - amount)
  before.value = {
    [from]: [...after[from]!, ...Array<number>(amount).fill(color)],
    [to]: targetBefore,
  }

  // Layout geometry relative to the container (offsets ignore the "lifted" transform).
  const sx = source.offsetLeft + source.offsetWidth / 2
  const tx = target.offsetLeft + target.offsetWidth / 2
  const width = target.offsetWidth
  const side = sx < tx ? -1 : 1
  const mouthX = tx + side * width * 0.18
  const mouthY = target.offsetTop - width * 0.35
  const dx = mouthX - sx
  const dy = mouthY - source.offsetTop
  const angle = side * -105
  const moved = `translate(${dx}px, ${dy}px)`

  busy.value = true
  source.style.zIndex = '5'
  const pourMs = 60 + amount * FILL_MS
  const total = FLY_MS + TILT_MS + pourMs + TILT_MS + BACK_MS
  const at = (ms: number) => ms / total
  const switchAt = FLY_MS + TILT_MS
  const animation = source.animate(
    [
      { transform: 'none' },
      { transform: `${moved} rotate(0deg)`, offset: at(FLY_MS) },
      { transform: `${moved} rotate(${angle}deg)`, offset: at(switchAt) },
      { transform: `${moved} rotate(${angle}deg)`, offset: at(switchAt + pourMs) },
      { transform: `${moved} rotate(0deg)`, offset: at(switchAt + pourMs + TILT_MS) },
      { transform: 'none' },
    ],
    { duration: total, easing: 'ease-in-out' },
  )

  // The stream falls from the mouth onto the liquid surface of the target.
  const glassBottom = target.offsetTop + targetGlass.offsetTop + targetGlass.offsetHeight
  const inner = targetGlass.offsetHeight - 2.5
  const surface = glassBottom - 2.5 - targetBefore.length * 0.22 * inner
  timers.push(
    setTimeout(() => {
      before.value = null
      stream.value = {
        key: pour.key,
        left: tx,
        top: mouthY,
        height: Math.max(8, surface - mouthY),
        color: waterColor(resolvedTheme.value, color),
      }
    }, switchAt),
    setTimeout(() => (stream.value = null), switchAt + pourMs),
  )
  animation.onfinish = animation.oncancel = () => {
    source.style.zIndex = ''
    busy.value = false
  }
}

watch(
  () => props.poured?.key,
  () => {
    clearTimers()
    before.value = null
    stream.value = null
    if (props.poured) animatePour(props.poured)
  },
)

onBeforeUnmount(clearTimers)

function onSelect(tube: number): void {
  if (!busy.value) emit('select', tube)
}

// --- Views ---------------------------------------------------------------------------

const views = computed(() =>
  props.tubes.map((real, index) => {
    const theme = resolvedTheme.value
    const tube = before.value?.[index] ?? real
    const names = real.map((color) => t(`watersort.colors.c${color}` as 'watersort.colors.c0'))
    const parts = [t('watersort.play.tube', { n: index + 1 })]
    parts.push(real.length ? t('watersort.play.layers', { list: names.join(', ') }) : t('watersort.play.empty'))
    if (props.selected === index) parts.push(t('watersort.play.selected'))
    const fresh = !before.value && props.poured?.to === index ? props.poured.amount : 0
    return {
      index,
      label: parts.join(', '),
      complete: isComplete(tube),
      layers: tube.map((color, i) => {
        const base = waterColor(theme, color)
        return {
          key: i,
          style: {
            '--c': base,
            '--c-light': shade(base, 0.38),
            '--c-dark': shade(base, -0.32),
            '--wave-delay': `${-((index * 7 + i * 3) % 10) * 0.17}s`,
            color: symbolColor(theme, color),
            /* Layers of one pour fill up one after the other, from the bottom up. */
            '--fill-delay': `${Math.max(0, i - (tube.length - fresh)) * FILL_MS}ms`,
            '--fill-ms': `${FILL_MS}ms`,
          },
          symbol: colorLabel(color),
          fresh: i >= tube.length - fresh,
          top: i === tube.length - 1,
        }
      }),
    }
  }),
)
</script>

<template>
  <div
    ref="root"
    class="tubes"
    :style="{ '--per-row': perRow }"
    role="group"
    :aria-label="t('watersort.play.tubes')"
  >
    <button
      v-for="tube in views"
      :key="tube.index"
      type="button"
      class="tube"
      :class="{
        'tube--selected': selected === tube.index,
        'tube--complete': tube.complete,
        'tube--hint': hint?.from === tube.index || hint?.to === tube.index,
        'tube--refused': refused?.tube === tube.index,
      }"
      :data-tube="tube.index"
      :aria-label="tube.label"
      :aria-pressed="selected === tube.index"
      :disabled="disabled"
      @click="onSelect(tube.index)"
    >
      <span :key="refused?.tube === tube.index ? `r${refused.key}` : 'tube'" class="tube__body">
        <span class="tube__rim" />
        <span v-if="tube.complete" class="tube__cork" />
        <span class="tube__glass">
          <span
            v-for="layer in tube.layers"
            :key="`${layer.key}-${layer.fresh ? poured?.key : ''}`"
            class="layer"
            :class="{ 'layer--fresh': layer.fresh, 'layer--top': layer.top }"
            :style="layer.style"
          >
            <span v-if="symbols" class="layer__symbol" aria-hidden="true">{{ layer.symbol }}</span>
          </span>
        </span>
        <span class="tube__shine" />
      </span>
      <span class="tube__n" aria-hidden="true">{{ tube.index + 1 }}</span>
    </button>
    <span
      v-if="stream"
      :key="stream.key"
      class="stream"
      aria-hidden="true"
      :style="{
        left: `${stream.left}px`,
        top: `${stream.top}px`,
        height: `${stream.height}px`,
        '--c': stream.color,
      }"
    />
  </div>
</template>

<style scoped>
.tubes {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--per-row), minmax(0, 1fr));
  justify-items: center;
  gap: var(--space-6, 28px) var(--space-2);
  width: 100%;
  padding-top: var(--space-5);
}

.tube {
  position: relative;
  display: block;
  width: min(100%, 56px);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  touch-action: manipulation;
  transform-origin: 50% 0;
  transition: transform var(--dur-med) var(--ease-out);
}

.tube__n {
  display: block;
  margin-top: 4px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-muted);
}

.tube--hint .tube__n,
.tube--selected .tube__n {
  color: var(--color-text);
}

.tube:disabled {
  cursor: default;
}

/* --- Glass ------------------------------------------------------------------------ */

.tube__body {
  --glass-edge: color-mix(in srgb, var(--color-text) 38%, transparent);

  position: relative;
  display: block;
  padding-top: 6px;
}

/* The lip at the top of the test tube: a little wider than the glass, with a highlight. */
.tube__rim {
  position: absolute;
  top: 0;
  left: -4px;
  right: -4px;
  z-index: 2;
  height: 9px;
  border: 2.5px solid var(--glass-edge);
  border-radius: 6px;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 85%),
    color-mix(in srgb, var(--color-surface) 70%, transparent) 60%,
    rgb(0 0 0 / 6%)
  );
  box-shadow: 0 2px 3px rgb(0 0 0 / 12%);
}

.tube__glass {
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  width: 100%;
  aspect-ratio: 1 / 3.6;
  /* No padding: the bottom layer fills the rounded bottom of the glass (clipped by it). */
  padding: 0;
  overflow: hidden;
  border: 2.5px solid var(--glass-edge);
  border-top: 0;
  border-radius: 0 0 26px 26px;
  background: linear-gradient(
    90deg,
    rgb(255 255 255 / 25%),
    color-mix(in srgb, var(--color-surface) 45%, transparent) 40%,
    rgb(255 255 255 / 10%)
  );
  box-shadow:
    inset -4px 0 6px rgb(0 0 0 / 8%),
    0 6px 12px rgb(0 0 0 / 12%);
}

/* A vertical reflection over the glass and the liquid. */
.tube__shine {
  position: absolute;
  top: 14px;
  bottom: 18px;
  left: 18%;
  z-index: 3;
  width: 14%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(255 255 255 / 70%), rgb(255 255 255 / 15%));
  pointer-events: none;
}

/* A cork closes a finished tube. */
.tube__cork {
  position: absolute;
  top: -9px;
  left: 18%;
  right: 18%;
  z-index: 3;
  height: 14px;
  border: 2px solid #6b3d14;
  border-radius: 4px 4px 3px 3px;
  background: linear-gradient(180deg, #e0ad6e, #b97a3c);
  animation: cork 0.45s cubic-bezier(0.3, 1.6, 0.5, 1) both;
}

/* --- Liquid ------------------------------------------------------------------------- */

.layer {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  /* Four layers fill 88 % of the glass; the rest stays free at the top. */
  height: 22%;
  /*
   * Round liquid: dark edges, a light band, and a few rising bubbles. The bubble tiles have
   * different, odd sizes, so the bubbles do not line up in columns.
   */
  background:
    radial-gradient(circle, rgb(255 255 255 / 40%) 1.1px, transparent 1.6px) 5px 3px / 19px 29px,
    radial-gradient(circle, rgb(255 255 255 / 30%) 0.9px, transparent 1.4px) 14px 17px / 23px 37px,
    radial-gradient(circle, rgb(255 255 255 / 25%) 0.8px, transparent 1.3px) 9px 9px / 31px 23px,
    linear-gradient(90deg, var(--c-dark), var(--c) 24%, var(--c-light) 44%, var(--c) 66%, var(--c-dark));
  animation: bubbles 4s linear infinite;
  animation-delay: var(--wave-delay);
}

/* A wavy edge on top of every layer – the border to the next colour (or the surface). */
.layer::before {
  content: '';
  position: absolute;
  bottom: calc(100% - 1px);
  left: -2px;
  right: -2px;
  z-index: 1;
  height: 7px;
  background: linear-gradient(90deg, var(--c-dark), var(--c) 24%, var(--c-light) 44%, var(--c) 66%, var(--c-dark));
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 8'%3E%3Cpath d='M0 4Q6 0 12 4T24 4V8H0Z'/%3E%3C/svg%3E")
    0 0 / 18px 7px repeat-x;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 8'%3E%3Cpath d='M0 4Q6 0 12 4T24 4V8H0Z'/%3E%3C/svg%3E")
    0 0 / 18px 7px repeat-x;
  animation: wave 1.8s linear infinite;
  animation-delay: var(--wave-delay);
}

/* The surface of the top layer gets a light film. */
.layer--top::after {
  content: '';
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  z-index: 2;
  height: 3px;
  border-radius: 50%;
  background: rgb(255 255 255 / 35%);
}

.layer__symbol {
  position: relative;
  z-index: 2;
  font-size: var(--text-sm);
  font-weight: 800;
}

.layer--fresh {
  transform-origin: bottom;
  /* Hidden until its turn (fill-mode both), then it rises from the bottom. */
  animation:
    fill var(--fill-ms) linear var(--fill-delay) both,
    bubbles 4s linear infinite;
}

/* --- The stream while pouring --------------------------------------------------------- */

.stream {
  position: absolute;
  z-index: 4;
  width: 7px;
  margin-left: -3.5px;
  border-radius: 4px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 70%, #000), var(--c), color-mix(in srgb, var(--c) 60%, #fff), var(--c));
  transform-origin: top;
  animation: stream 160ms ease-out both;
  pointer-events: none;
}

/* --- States ---------------------------------------------------------------------------- */

.tube--selected {
  transform: translateY(-18px);
}

.tube--selected .tube__body {
  --glass-edge: var(--color-accent);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 45%, transparent));
}

.tube--hint .tube__body {
  --glass-edge: var(--color-accent);
}

.tube--hint .tube__glass {
  box-shadow:
    0 0 0 3px var(--color-accent-soft),
    0 6px 12px rgb(0 0 0 / 12%);
}

.tube--complete .tube__body {
  --glass-edge: var(--game-watersort);
}

.tube--complete .tube__glass {
  animation: done-glow 0.9s ease-out;
}

.tube--refused .tube__body {
  animation: shake 300ms ease-out;
}

.tube:focus-visible {
  outline: 2px dashed var(--color-text);
  outline-offset: 6px;
}

@keyframes fill {
  from {
    transform: scaleY(0);
  }
}

@keyframes wave {
  to {
    -webkit-mask-position: 18px 0;
    mask-position: 18px 0;
  }
}

@keyframes bubbles {
  to {
    background-position:
      5px -55px,
      14px -57px,
      9px -14px,
      0 0;
  }
}

@keyframes stream {
  from {
    transform: scaleY(0);
  }
}

@keyframes cork {
  from {
    transform: translateY(-22px) rotate(-20deg);
    opacity: 0;
  }
}

@keyframes done-glow {
  40% {
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--game-watersort) 40%, transparent),
      0 0 22px 6px color-mix(in srgb, var(--game-watersort) 45%, transparent);
  }
}

@keyframes shake {
  25% {
    transform: translateX(-4px);
  }

  75% {
    transform: translateX(4px);
  }
}

:root[data-motion='reduced'] .tube {
  transition: none;
}

:root[data-motion='reduced'] .layer,
:root[data-motion='reduced'] .layer::before,
:root[data-motion='reduced'] .layer--fresh,
:root[data-motion='reduced'] .tube__cork,
:root[data-motion='reduced'] .tube--complete .tube__glass,
:root[data-motion='reduced'] .tube--refused .tube__body {
  animation: none;
}
</style>
