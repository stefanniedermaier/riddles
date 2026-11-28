<script setup lang="ts">
import { computed, useId } from 'vue'

import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import BubbleArt from './BubbleArt.vue'
import { COLOR_KEYS } from './colors'
import { goalReached, type BubblesRun } from './logic/engine'
import { EMPTY } from './logic/types'

/** The goal of a level and how far it is: a line above the field. */
const props = defineProps<{ run: BubblesRun; symbols: boolean }>()

const shine = `bubbles-goal-${useId()}`

const text = computed(() => {
  const goal = props.run.goal
  switch (goal?.type) {
    case 'clear':
      return t('bubbles.goals.clear')
    case 'free':
      return t('bubbles.goals.free')
    case 'color':
      return t('bubbles.goals.color', {
        count: goal.count,
        color: t(`bubbles.colors.${COLOR_KEYS[goal.color]!}`),
      })
    case 'score':
      return t('bubbles.goals.score', { target: formatNumber(goal.target) })
    default:
      return ''
  }
})

const progress = computed(() => {
  const { goal, progress, cells, score } = props.run
  switch (goal?.type) {
    case 'clear':
      return formatNumber(cells.filter((value) => value !== EMPTY).length)
    case 'free':
    case 'color':
      return `${formatNumber(Math.min(progress, goal.count))} / ${formatNumber(goal.count)}`
    case 'score':
      return `${formatNumber(Math.min(score, goal.target))} / ${formatNumber(goal.target)}`
    default:
      return ''
  }
})

const done = computed(() => goalReached(props.run))
</script>

<template>
  <section class="goal" :class="{ 'goal--done': done }">
    <svg v-if="run.goal?.type === 'color'" class="goal__bubble" viewBox="-0.5 -0.5 1 1" aria-hidden="true">
      <defs>
        <radialGradient :id="shine" cx="0.36" cy="0.3" r="0.7">
          <stop offset="0" stop-color="#fff" stop-opacity="0.7" />
          <stop offset="0.7" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <BubbleArt :value="run.goal.color" :x="0" :y="0" :symbols="symbols" :shine="shine" />
    </svg>
    <span class="goal__label">{{ t('bubbles.play.goal') }}</span>
    <span class="goal__text">{{ text }}</span>
    <strong class="goal__progress tabular">{{ progress }}</strong>
  </section>
</template>

<style scoped>
.goal {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: min(100%, 480px);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  font-size: var(--text-sm);
}

.goal--done {
  background: color-mix(in srgb, var(--color-success) 16%, var(--color-surface));
}

.goal__bubble {
  flex: none;
  width: 22px;
  height: 22px;
}

.goal__label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.goal__text {
  flex: 1;
}

.goal__progress {
  font-weight: 800;
}
</style>
