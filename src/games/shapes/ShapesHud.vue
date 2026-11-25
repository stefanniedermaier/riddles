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
  /** Changes whenever flying points arrive (restarts the bump animation). */
  scoreBump?: number
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
      <div class="hud__stat plate">
        <span class="hud__label">{{ t('shapes.hud.score') }}</span>
        <strong :key="scoreBump" class="hud__value tabular score-bump" data-score-target>
          {{ formatNumber(score) }}
        </strong>
      </div>

      <div v-if="mode === 'time'" class="hud__stat hud__stat--end plate">
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

        <ul v-if="goals" class="goals plate" :aria-label="t('shapes.hud.goals')">
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
        <AppIcon name="starFilled" :size="20" class="level-score__star" />
        {{ t('shapes.hud.score') }}
        <strong :key="scoreBump" class="tabular score-bump" data-score-target>
          {{ formatNumber(score) }}
        </strong>
      </p>
    </template>
  </section>
</template>

<style scoped>
/*
 * Game-style HUD: cream "plates" with a bevel, a green moves badge and a golden score
 * ribbon – it sits on the garden backdrop, so it carries its own colours.
 */
.hud {
  --plate-top: #fffbf0;
  --plate-bottom: #f3e3bf;
  --plate-border: #c99a5b;
  --plate-text: #5a3515;
  --plate-muted: #9a7449;
  --track: rgb(120 80 30 / 22%);

  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

:root[data-theme='dark'] .hud {
  --plate-top: #3d3756;
  --plate-bottom: #2b2640;
  --plate-border: #6d6194;
  --plate-text: #f3ecff;
  --plate-muted: #b7aad8;
  --track: rgb(0 0 0 / 35%);
}

.plate {
  border: 2px solid var(--plate-border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--plate-top), var(--plate-bottom));
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 55%),
    inset 0 -3px 0 rgb(120 80 30 / 18%),
    0 4px 10px rgb(0 0 0 / 22%);
  color: var(--plate-text);
}

:root[data-theme='dark'] .plate {
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 12%),
    inset 0 -3px 0 rgb(0 0 0 / 25%),
    0 4px 10px rgb(0 0 0 / 40%);
}

.hud__row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: var(--space-2);
}

.hud__stat {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 110px;
  padding: 6px var(--space-3) 8px;
}

.hud__stat--end {
  align-items: flex-end;
}

.hud__label {
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--plate-muted);
}

.hud__value {
  font-size: var(--text-2xl);
  font-weight: 900;
  line-height: 1.1;
}

.hud__value--low {
  color: #e0283c;
}

.hud__bonus {
  position: absolute;
  top: 100%;
  right: var(--space-2);
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg, #6fdc77, #2e9a3e);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 900;
  text-shadow: 0 1px 0 #1d6b2a;
  white-space: nowrap;
  animation: bonus-fade 1.2s var(--ease-out) forwards;
}

.timebar {
  height: 14px;
  padding: 2px;
  overflow: hidden;
  border: 2px solid var(--plate-border);
  border-radius: var(--radius-full);
  background: var(--plate-bottom);
  box-shadow: 0 3px 8px rgb(0 0 0 / 20%);
}

.timebar__fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg, #8ff07c 0 35%, #3cb850 36%, #23913a);
  transform-origin: left center;
  transition: transform 0.2s linear;
}

.timebar__fill--low {
  background: linear-gradient(180deg, #ff9aa6 0 35%, #f2263f 36%, #b0101f);
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
  width: 80px;
  padding: var(--space-2) var(--space-1);
  border: 2px solid #1d6b2a;
  border-radius: 18px;
  background: radial-gradient(circle at 35% 25%, #8ff07c, #3cb850 55%, #23913a);
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 45%),
    inset 0 -4px 0 rgb(0 0 0 / 18%),
    0 4px 10px rgb(0 0 0 / 25%);
  color: #fff;
  text-shadow: 0 2px 0 rgb(0 60 10 / 55%);
}

.moves__value {
  font-size: 2.1rem;
  font-weight: 900;
  line-height: 1;
}

.moves__label {
  margin-top: 2px;
  font-size: 0.6875rem;
  font-weight: 800;
  text-align: center;
  line-height: 1.15;
}

.moves--low {
  border-color: #7d0718;
  background: radial-gradient(circle at 35% 25%, #ff9aa6, #f2263f 55%, #a30c22);
  text-shadow: 0 2px 0 rgb(90 0 15 / 55%);
  animation: moves-pulse 1s ease-in-out infinite;
}

.goals {
  display: flex;
  flex: 1;
  gap: var(--space-1);
  min-width: 0;
  margin: 0;
  padding: 6px;
  list-style: none;
}

.goal {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px var(--space-1) 4px;
  border-radius: 12px;
  color: var(--plate-text);
  transition: background var(--dur-med) var(--ease-out);
}

.goal--done {
  background: rgb(60 184 80 / 16%);
}

.goal__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #e3a000;
  filter: drop-shadow(0 2px 1px rgb(0 0 0 / 18%));
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
  width: 19px;
  height: 19px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: linear-gradient(180deg, #6fdc77, #2e9a3e);
  color: #fff;
  animation: check-pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
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
  color: var(--plate-muted);
}

.goal__bar {
  width: 100%;
  height: 7px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--track);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 20%);
}

.goal__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg, #ffe27a 0 40%, #ffb020 41%, #e08a00);
  transform-origin: left center;
  transition: transform var(--dur-med) var(--ease-out);
}

.goal--done .goal__fill {
  background: linear-gradient(180deg, #8ff07c 0 40%, #3cb850 41%, #23913a);
}

/* Golden score ribbon (levels). */
.level-score {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  padding: 3px 14px 3px 6px;
  border: 2px solid #c77800;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg, #fff0a8, #ffc838 55%, #f3a300);
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 60%),
    0 3px 8px rgb(0 0 0 / 22%);
  color: #5a3000;
  font-size: var(--text-sm);
  font-weight: 800;
}

.level-score__star {
  color: #fff;
  filter: drop-shadow(0 1px 0 #b36a00);
}

.level-score strong {
  font-size: var(--text-base);
  font-weight: 900;
}

.score-bump {
  display: inline-block;
  animation: score-bump 0.32s var(--ease-out);
}

@keyframes score-bump {
  40% {
    transform: scale(1.3);
    color: #e0283c;
  }
}

@keyframes moves-pulse {
  50% {
    transform: scale(1.05);
  }
}

@keyframes check-pop {
  from {
    transform: scale(0);
  }
}

:root[data-motion='reduced'] .score-bump,
:root[data-motion='reduced'] .moves--low,
:root[data-motion='reduced'] .goal__check {
  animation: none;
}

@keyframes bonus-fade {
  0% {
    opacity: 0;
    transform: translateY(-4px) scale(0.7);
  }
  15% {
    opacity: 1;
    transform: translateY(0) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateY(6px);
  }
}
</style>
