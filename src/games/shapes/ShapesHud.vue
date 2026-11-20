<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import type { GoalStatus } from './logic/levels'
import { TIME_LIMIT_MS } from './logic/modes'
import type { Mode } from './logic/types'
import ShapePiece from './ShapePiece.vue'

const props = defineProps<{
  mode: Mode
  score: number
  /** Time mode. */
  remainingMs?: number
  /** Time mode: last bonus in ms, shown briefly; `bonusKey` restarts the animation. */
  bonusMs?: number
  bonusKey?: number
  /** Levels mode. */
  movesLeft?: number
  goals?: GoalStatus[]
}>()

const seconds = computed(() => Math.ceil((props.remainingMs ?? 0) / 1000))
const timeFraction = computed(() => Math.min(1, (props.remainingMs ?? 0) / TIME_LIMIT_MS))
const lowTime = computed(() => (props.remainingMs ?? 0) <= 10_000)

function goalLabel(status: GoalStatus): string {
  const goal = status.goal
  switch (goal.type) {
    case 'score':
      return t('shapes.goals.score', { target: formatNumber(goal.target) })
    case 'collect':
      return t('shapes.goals.collect', {
        count: goal.count,
        shape: t(`shapes.kinds.k${goal.kind as 0 | 1 | 2 | 3 | 4 | 5}`),
      })
    case 'specials':
      return t('shapes.goals.specials', { count: goal.count })
  }
}
</script>

<template>
  <section class="hud">
    <div class="hud__row">
      <div class="hud__stat">
        <span class="hud__label">{{ t('shapes.hud.score') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(score) }}</strong>
      </div>

      <div v-if="mode === 'time'" class="hud__stat hud__stat--end">
        <span class="hud__label">{{ t('shapes.hud.time') }}</span>
        <strong class="hud__value tabular" :class="{ 'hud__value--low': lowTime }">
          {{ seconds }} s
        </strong>
        <span v-if="bonusMs" :key="bonusKey" class="hud__bonus">
          {{ t('shapes.hud.bonusTime', { seconds: Math.round(bonusMs / 1000) }) }}
        </span>
      </div>

      <div v-else-if="mode === 'levels'" class="hud__stat hud__stat--end">
        <span class="hud__label">{{ t('shapes.hud.moves') }}</span>
        <strong class="hud__value tabular" :class="{ 'hud__value--low': (movesLeft ?? 0) <= 3 }">
          {{ movesLeft }}
        </strong>
      </div>
    </div>

    <div v-if="mode === 'time'" class="timebar" aria-hidden="true">
      <div
        class="timebar__fill"
        :class="{ 'timebar__fill--low': lowTime }"
        :style="{ transform: `scaleX(${timeFraction})` }"
      />
    </div>

    <ul v-if="mode === 'levels' && goals" class="goals" :aria-label="t('shapes.hud.goals')">
      <li
        v-for="(status, i) in goals"
        :key="i"
        class="goal"
        :class="{ 'goal--done': status.done }"
        :title="goalLabel(status)"
      >
        <span class="visually-hidden">{{ goalLabel(status) }}</span>
        <span class="goal__icon" aria-hidden="true">
          <AppIcon v-if="status.done" name="check" :size="16" />
          <AppIcon v-else-if="status.goal.type === 'score'" name="trophy" :size="16" />
          <ShapePiece
            v-else-if="status.goal.type === 'collect'"
            :kind="status.goal.kind"
            special="none"
          />
          <ShapePiece v-else :kind="4" special="burst" />
        </span>
        <span class="goal__count tabular" aria-hidden="true">
          {{ status.goal.type === 'score' ? formatNumber(status.current) : status.current }} /
          {{ status.goal.type === 'score' ? formatNumber(status.target) : status.target }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hud {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.hud__row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.hud__stat {
  position: relative;
  display: flex;
  flex-direction: column;
}

.hud__stat--end {
  align-items: flex-end;
}

.hud__label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud__value {
  font-size: var(--text-2xl);
  font-weight: 800;
  line-height: 1.1;
}

.hud__value--low {
  color: var(--color-error);
}

.hud__bonus {
  position: absolute;
  top: 100%;
  right: 0;
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: 800;
  white-space: nowrap;
  animation: bonus-fade 1.2s var(--ease-out) forwards;
}

.timebar {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-3);
}

.timebar__fill {
  height: 100%;
  background: var(--game-shapes);
  transform-origin: left center;
  transition: transform 0.2s linear;
}

.timebar__fill--low {
  background: var(--color-error);
}

.goals {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.goal {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 10px 4px 6px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  font-size: var(--text-sm);
  font-weight: 700;
}

.goal--done {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.goal__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

@keyframes bonus-fade {
  0% {
    opacity: 0;
    transform: translateY(-4px);
  }
  15% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(6px);
  }
}
</style>
