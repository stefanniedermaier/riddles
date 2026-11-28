<script setup lang="ts">
import { computed, useId } from 'vue'

import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import BubbleArt from './BubbleArt.vue'
import BubbleDefs from './BubbleDefs.vue'
import { COLOR_KEYS } from './colors'
import { goalReached, type BubblesRun } from './logic/engine'
import { EMPTY } from './logic/types'

/** The goal of a level and how far it is: a line above the field. */
const props = defineProps<{ run: BubblesRun; symbols: boolean }>()

const ids = `bubbles-goal-${useId()}`

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
  <section class="goal bx-panel" :class="{ 'goal--done': done }">
    <svg v-if="run.goal?.type === 'color'" class="goal__bubble" viewBox="-0.55 -0.55 1.1 1.1" aria-hidden="true">
      <BubbleDefs :ids="ids" />
      <BubbleArt :value="run.goal.color" :x="0" :y="0" :symbols="symbols" :ids="ids" :halo="false" />
    </svg>
    <span class="goal__label bx-label">{{ t('bubbles.play.goal') }}</span>
    <span class="goal__text">{{ text }}</span>
    <strong class="goal__progress bx-value tabular">{{ progress }}</strong>
  </section>
</template>

<style src="./console.css"></style>

<style scoped>
.goal {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: min(100%, 480px);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
}

.goal--done {
  border-color: #3dffa8;
  box-shadow:
    0 0 14px rgb(61 255 168 / 45%),
    inset 0 0 14px rgb(61 255 168 / 18%);
}

.goal__bubble {
  flex: none;
  width: 24px;
  height: 24px;
}

.goal__text {
  flex: 1;
}

.goal__progress {
  font-size: var(--text-md);
}
</style>
