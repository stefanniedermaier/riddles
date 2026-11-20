<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import type { GoalStatus } from './logic/levels'
import { TIME_LIMIT_MS } from './logic/modes'
import { ITEM_KIND, type Mode } from './logic/types'
import ObstacleArt from './ObstacleArt.vue'
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
const lowMoves = computed(() => (props.movesLeft ?? 0) <= 3)

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
    default:
      return t(`shapes.goals.${goal.type}`, { count: goal.count })
  }
}

function goalA11y(status: GoalStatus): string {
  const progress = status.done
    ? t('shapes.goals.done')
    : t('shapes.goals.progress', { current: status.current, target: status.target })
  return `${goalLabel(status)}: ${progress}`
}

const fmt = (status: GoalStatus, value: number) =>
  status.goal.type === 'score' ? formatNumber(value) : String(value)
</script>

<template>
  <section class="hud" :class="{ 'hud--levels': mode === 'levels' }">
    <!-- Zen / Time -->
    <div v-if="mode !== 'levels'" class="hud__row">
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
    </div>

    <div v-if="mode === 'time'" class="timebar" aria-hidden="true">
      <div
        class="timebar__fill"
        :class="{ 'timebar__fill--low': lowTime }"
        :style="{ transform: `scaleX(${timeFraction})` }"
      />
    </div>

    <!-- Levels: moves + goal cards -->
    <template v-if="mode === 'levels'">
      <div class="level-row">
        <div class="moves" :class="{ 'moves--low': lowMoves }" role="status">
          <strong class="moves__value tabular">{{ movesLeft }}</strong>
          <span class="moves__label">{{ t('shapes.hud.movesLeft') }}</span>
        </div>

        <ul v-if="goals" class="goals" :aria-label="t('shapes.hud.goals')">
          <li
            v-for="(status, i) in goals"
            :key="i"
            class="goal"
            :class="{ 'goal--done': status.done }"
            :title="goalLabel(status)"
          >
            <span class="visually-hidden">{{ goalA11y(status) }}</span>
            <span class="goal__icon" aria-hidden="true">
              <AppIcon v-if="status.goal.type === 'score'" name="trophy" :size="22" />
              <ShapePiece
                v-else-if="status.goal.type === 'collect'"
                :kind="status.goal.kind"
                special="none"
              />
              <ShapePiece v-else-if="status.goal.type === 'specials'" :kind="4" special="burst" />
              <ShapePiece v-else-if="status.goal.type === 'items'" :kind="ITEM_KIND" special="none" />
              <ObstacleArt v-else-if="status.goal.type === 'targets'" type="target" />
              <ObstacleArt v-else-if="status.goal.type === 'crates'" type="crate" />
              <span v-else class="goal__chain">
                <ShapePiece :kind="3" special="none" />
                <ObstacleArt type="chain" />
              </span>
              <span v-if="status.done" class="goal__check">
                <AppIcon name="check" :size="14" />
              </span>
            </span>
            <span class="goal__count tabular" aria-hidden="true">
              <strong>{{ fmt(status, status.current) }}</strong>
              <span class="goal__target">/{{ fmt(status, status.target) }}</span>
            </span>
            <span class="goal__bar" aria-hidden="true">
              <span
                class="goal__fill"
                :style="{ transform: `scaleX(${Math.min(1, status.current / status.target)})` }"
              />
            </span>
          </li>
        </ul>
      </div>
      <p class="level-score">
        {{ t('shapes.hud.score') }}
        <strong class="tabular">{{ formatNumber(score) }}</strong>
      </p>
    </template>
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

/* --- Levels ------------------------------------------------------------------------ */

.level-row {
  display: flex;
  gap: var(--space-2);
  align-items: stretch;
}

.moves {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 76px;
  padding: var(--space-2) var(--space-1);
  border-radius: var(--radius-md);
  background: var(--color-text);
  color: var(--color-bg);
}

.moves__value {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
}

.moves__label {
  margin-top: 2px;
  font-size: 0.6875rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.15;
}

.moves--low {
  background: var(--color-error);
  color: #fff;
}

.goals {
  display: flex;
  flex: 1;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.goal {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: var(--space-2) var(--space-1) 6px;
  border: 2px solid color-mix(in srgb, var(--color-border-strong) 30%, transparent);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.goal--done {
  border-color: var(--color-success);
  background: var(--color-success-soft);
}

.goal__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--game-crowns);
}

.goal__chain {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.goal__chain > :deep(svg) {
  position: absolute;
  inset: 0;
}

.goal__check {
  position: absolute;
  right: -8px;
  bottom: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-success);
  color: #fff;
}

.goal__count {
  font-size: var(--text-lg);
  line-height: 1;
  white-space: nowrap;
}

.goal__count strong {
  font-weight: 900;
}

.goal__target {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-muted);
}

.goal__bar {
  width: 100%;
  height: 5px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-3);
}

.goal__fill {
  display: block;
  height: 100%;
  background: var(--game-shapes);
  transform-origin: left center;
  transition: transform var(--dur-med) var(--ease-out);
}

.goal--done .goal__fill {
  background: var(--color-success);
}

.level-score {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.level-score strong {
  color: var(--color-text);
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
