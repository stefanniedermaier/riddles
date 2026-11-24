<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/core/i18n'
import { resolvedTheme } from '@/core/theme'
import { isComplete } from './logic/rules'
import type { Tubes } from './logic/types'
import { colorLabel, symbolColor, waterColor } from './palette'

export interface Pour {
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

const views = computed(() =>
  props.tubes.map((tube, index) => {
    const theme = resolvedTheme.value
    const names = tube.map((color) => t(`watersort.colors.c${color}` as 'watersort.colors.c0'))
    const parts = [t('watersort.play.tube', { n: index + 1 })]
    parts.push(tube.length ? t('watersort.play.layers', { list: names.join(', ') }) : t('watersort.play.empty'))
    if (props.selected === index) parts.push(t('watersort.play.selected'))
    const fresh = props.poured?.to === index ? props.poured.amount : 0
    return {
      index,
      label: parts.join(', '),
      complete: isComplete(tube),
      layers: tube.map((color, i) => ({
        key: i,
        background: waterColor(theme, color),
        symbol: colorLabel(color),
        symbolColor: symbolColor(theme, color),
        fresh: i >= tube.length - fresh,
      })),
    }
  }),
)
</script>

<template>
  <div class="tubes" :style="{ '--per-row': perRow }" role="group" :aria-label="t('watersort.play.tubes')">
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
      @click="emit('select', tube.index)"
    >
      <span :key="refused?.tube === tube.index ? `r${refused.key}` : 'tube'" class="tube__glass">
        <span
          v-for="layer in tube.layers"
          :key="`${layer.key}-${layer.fresh ? poured?.key : ''}`"
          class="layer"
          :class="{ 'layer--fresh': layer.fresh }"
          :style="{ background: layer.background, color: layer.symbolColor }"
        >
          <span v-if="symbols" class="layer__symbol" aria-hidden="true">{{ layer.symbol }}</span>
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.tubes {
  display: grid;
  grid-template-columns: repeat(var(--per-row), minmax(0, 1fr));
  justify-items: center;
  gap: var(--space-5) var(--space-2);
  width: 100%;
  padding-top: var(--space-4);
}

.tube {
  display: block;
  width: min(100%, 56px);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform var(--dur-med) var(--ease-out);
}

.tube:disabled {
  cursor: default;
}

.tube__glass {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  width: 100%;
  aspect-ratio: 1 / 3.6;
  padding: 4px 4px 6px;
  overflow: hidden;
  border: 3px solid var(--color-border-strong);
  border-top-width: 0;
  border-radius: 4px 4px 22px 22px;
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  box-shadow: var(--shadow-sm);
}

.layer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  /* Four layers fill 88 % of the glass; the rest stays free at the top. */
  height: 22%;
  border-radius: 2px;
}

.layer:first-child {
  border-radius: 2px 2px 16px 16px;
}

.layer__symbol {
  font-size: var(--text-sm);
  font-weight: 800;
}

.layer--fresh {
  transform-origin: bottom;
  animation: fill 260ms var(--ease-out);
}

.tube--selected {
  transform: translateY(-16px);
}

.tube--selected .tube__glass {
  border-color: var(--color-accent);
}

.tube--hint .tube__glass {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.tube--complete .tube__glass {
  border-color: var(--game-watersort);
}

.tube--refused .tube__glass {
  animation: shake 300ms ease-out;
}

.tube:focus-visible {
  outline: 2px dashed var(--color-text);
  outline-offset: 4px;
}

@keyframes fill {
  from {
    transform: scaleY(0);
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

:root[data-motion='reduced'] .layer--fresh,
:root[data-motion='reduced'] .tube--refused .tube__glass {
  animation: none;
}
</style>
