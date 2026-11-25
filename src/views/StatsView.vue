<script setup lang="ts">
import { computed, ref } from 'vue'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameArt from '@/components/GameArt.vue'
import { formatDate, formatDuration, formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getActivity, getStats, resetStats, type VariantStats } from '@/core/stats'
import { visibleGames } from '@/games/layout'
import type { GameDescriptor, GameId } from '@/games/types'

interface Row {
  variant: string
  label: string
  started: number
  finished: number
  best: string
  /** Card games (`statKind: 'both'`): the high score next to the best time. */
  bestScore?: string
  average?: string
}

interface Totals {
  started: number
  finished: number
  timeMs: number
  totalScore: number
  scoredRuns: number
  lastPlayedAt?: string
}

function totalsOf(stats: Record<string, VariantStats>): Totals {
  const totals: Totals = { started: 0, finished: 0, timeMs: 0, totalScore: 0, scoredRuns: 0 }
  for (const s of Object.values(stats)) {
    totals.started += s.started
    totals.finished += s.finished
    totals.timeMs += s.totalTimeMs
    totals.totalScore += s.totalScore ?? 0
    totals.scoredRuns += s.scoredRuns ?? 0
    if (s.lastPlayedAt && (!totals.lastPlayedAt || s.lastPlayedAt > totals.lastPlayedAt)) {
      totals.lastPlayedAt = s.lastPlayedAt
    }
  }
  return totals
}

const percent = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((Math.min(part, whole) / whole) * 100)} %` : '–'

function rowsFor(game: GameDescriptor, stats: Record<string, VariantStats>): Row[] {
  return game.variants
    .filter((variant) => stats[variant])
    .map((variant) => {
      const s = stats[variant]!
      const timeGame = game.statKind !== 'score'
      return {
        variant,
        label: game.variantLabel(variant),
        started: s.started,
        finished: s.finished,
        best: timeGame
          ? s.bestTimeMs !== undefined
            ? formatDuration(s.bestTimeMs)
            : '–'
          : s.bestScore !== undefined
            ? formatNumber(s.bestScore)
            : '–',
        bestScore:
          game.statKind === 'both' ? (s.bestScore !== undefined ? formatNumber(s.bestScore) : '–') : undefined,
        average: timeGame
          ? s.finished > 0
            ? formatDuration(s.totalTimeMs / s.finished)
            : undefined
          : s.scoredRuns
            ? formatNumber(Math.round((s.totalScore ?? 0) / s.scoredRuns))
            : undefined,
      }
    })
}

const sections = computed(() =>
  visibleGames.value.map((game) => {
    const stats = getStats(game.id)
    const totals = totalsOf(stats)
    const kpis = [
      { label: t('stats.started'), value: formatNumber(totals.started) },
      { label: t('stats.finished'), value: formatNumber(totals.finished) },
      game.statKind !== 'score'
        ? { label: t('stats.solvingTime'), value: totals.timeMs > 0 ? formatDuration(totals.timeMs) : '–' }
        : {
            label: t('stats.avgScore'),
            value: totals.scoredRuns > 0 ? formatNumber(Math.round(totals.totalScore / totals.scoredRuns)) : '–',
          },
    ]
    return { game, totals, kpis, rows: rowsFor(game, stats) }
  }),
)

const overview = computed(() => {
  const all = sections.value
  const started = all.reduce((sum, s) => sum + s.totals.started, 0)
  const finished = all.reduce((sum, s) => sum + s.totals.finished, 0)
  const timeMs = all.reduce((sum, s) => sum + s.totals.timeMs, 0)
  const activity = getActivity()
  const favourite = [...all].sort((a, b) => b.totals.started - a.totals.started)[0]
  return {
    tiles: [
      { label: t('stats.gamesPlayed'), value: formatNumber(started) },
      { label: t('stats.completion'), value: percent(finished, started), sub: formatNumber(finished) + ' ✓' },
      { label: t('stats.activeDays'), value: formatNumber(activity.activeDays) },
      {
        label: t('stats.dayStreak'),
        value: t('stats.days', { n: activity.currentStreak }),
        sub: t('stats.bestStreak', { n: activity.bestStreak }),
      },
      { label: t('stats.solvingTime'), value: timeMs > 0 ? formatDuration(timeMs) : '–' },
    ],
    favourite: favourite && favourite.totals.started > 0 ? favourite.game : null,
    hasData: started > 0,
  }
})

const resetTarget = ref<GameId | null>(null)

function confirmReset(): void {
  if (resetTarget.value) resetStats(resetTarget.value)
  resetTarget.value = null
}
</script>

<template>
  <AppBar :title="t('stats.title')" back-to="/" />

  <main class="page">
    <h2 class="section-title">{{ t('stats.overview') }}</h2>
    <section class="card overview">
      <p v-if="!overview.hasData" class="muted">{{ t('stats.empty') }}</p>
      <template v-else>
        <dl class="tiles">
          <div v-for="tile in overview.tiles" :key="tile.label" class="tile">
            <dt class="tile__label">{{ tile.label }}</dt>
            <dd class="tile__value tabular">{{ tile.value }}</dd>
            <dd v-if="tile.sub" class="tile__sub tabular">{{ tile.sub }}</dd>
          </div>
          <div v-if="overview.favourite" class="tile tile--favourite">
            <dt class="tile__label">{{ t('stats.favourite') }}</dt>
            <dd class="tile__game">
              <GameArt :game="overview.favourite.id" class="tile__art" />
              <span>{{ t(`${overview.favourite.id}.name`) }}</span>
            </dd>
          </div>
        </dl>
      </template>
    </section>

    <section v-for="{ game, totals, kpis, rows } in sections" :key="game.id" class="game">
      <header class="game__header">
        <GameArt :game="game.id" class="game__art" />
        <div class="game__title">
          <h2>{{ t(`${game.id}.name`) }}</h2>
          <p class="muted">
            {{ totals.lastPlayedAt ? t('stats.lastPlayed', { date: formatDate(totals.lastPlayedAt) }) : t('stats.notPlayed') }}
          </p>
        </div>
      </header>

      <div v-if="rows.length > 0" class="card stats">
        <dl class="kpis">
          <div v-for="kpi in kpis" :key="kpi.label" class="kpi">
            <dt>{{ kpi.label }}</dt>
            <dd class="tabular">{{ kpi.value }}</dd>
          </div>
        </dl>
        <table class="tabular">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">{{ t('stats.started') }}</th>
              <th scope="col">{{ t('stats.finished') }}</th>
              <th scope="col">
                {{ game.statKind === 'score' ? t('stats.bestScore') : t('stats.bestTime') }}
              </th>
              <th v-if="game.statKind === 'both'" scope="col">{{ t('stats.bestScore') }}</th>
              <th scope="col">{{ game.statKind === 'score' ? t('stats.avgScore') : t('stats.avgTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.variant">
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.started }}</td>
              <td>{{ row.finished }}</td>
              <td>{{ row.best }}</td>
              <td v-if="game.statKind === 'both'">{{ row.bestScore }}</td>
              <td>{{ row.average ?? '–' }}</td>
            </tr>
          </tbody>
        </table>
        <AppButton variant="ghost" icon="trash" @click="resetTarget = game.id">
          {{ t('stats.reset') }}
        </AppButton>
      </div>
    </section>
  </main>

  <ConfirmDialog
    :open="resetTarget !== null"
    :message="t('stats.resetConfirm', { game: resetTarget ? t(`${resetTarget}.name`) : '' })"
    :confirm-label="t('stats.reset')"
    danger
    @confirm="confirmReset"
    @cancel="resetTarget = null"
  />
</template>

<style scoped>
.overview {
  padding: var(--space-4);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: var(--space-3);
  border-radius: 0;
  background: var(--color-surface-2);
}

.tile dd {
  margin: 0;
}

.tile__label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.tile__value {
  font-size: var(--text-2xl);
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-text);
}

.tile__sub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.tile__game {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  font-weight: 800;
}

.tile__game .tile__art {
  width: 32px;
  height: 32px;
}

.game {
  margin-top: var(--space-5);
}

.game__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.game__header .game__art {
  width: 44px;
  height: 44px;
}

.game__title h2 {
  font-size: var(--text-lg);
  font-weight: 800;
}

.game__title p {
  font-size: var(--text-sm);
}

.stats {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  width: 100%;
  margin: 0 0 var(--space-1);
}

.kpi {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.kpi dt {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.kpi dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 800;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

th,
td {
  padding: var(--space-2) var(--space-1);
  text-align: right;
}

thead th {
  font-weight: 600;
  color: var(--color-text-muted);
}

tbody th {
  text-align: left;
  font-weight: 700;
}

tbody tr + tr {
  border-top: 1px solid var(--color-border);
}
</style>
