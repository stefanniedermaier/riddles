<script setup lang="ts">
import { computed, ref } from 'vue'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDuration, formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getStats, resetStats } from '@/core/stats'
import { games } from '@/games/registry'
import type { GameDescriptor, GameId } from '@/games/types'

interface Row {
  variant: string
  label: string
  started: number
  finished: number
  best: string
  average?: string
}

function rowsFor(game: GameDescriptor): Row[] {
  const stats = getStats(game.id)
  return game.variants
    .filter((variant) => stats[variant])
    .map((variant) => {
      const s = stats[variant]!
      return {
        variant,
        label: game.variantLabel(variant),
        started: s.started,
        finished: s.finished,
        best:
          game.statKind === 'time'
            ? s.bestTimeMs !== undefined
              ? formatDuration(s.bestTimeMs)
              : '–'
            : s.bestScore !== undefined
              ? formatNumber(s.bestScore)
              : '–',
        average:
          game.statKind === 'time' && s.finished > 0
            ? formatDuration(s.totalTimeMs / s.finished)
            : undefined,
      }
    })
}

const sections = computed(() => games.map((game) => ({ game, rows: rowsFor(game) })))

const resetTarget = ref<GameId | null>(null)

function confirmReset(): void {
  if (resetTarget.value) resetStats(resetTarget.value)
  resetTarget.value = null
}
</script>

<template>
  <AppBar :title="t('stats.title')" back-to="/" />

  <main class="page">
    <template v-for="{ game, rows } in sections" :key="game.id">
      <h2 class="section-title">{{ t(`${game.id}.name`) }}</h2>
      <section class="card stats">
        <p v-if="rows.length === 0" class="muted empty">{{ t('stats.empty') }}</p>
        <template v-else>
          <table class="tabular">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">{{ t('stats.started') }}</th>
                <th scope="col">{{ t('stats.finished') }}</th>
                <th scope="col">
                  {{ game.statKind === 'time' ? t('stats.bestTime') : t('stats.bestScore') }}
                </th>
                <th v-if="game.statKind === 'time'" scope="col">{{ t('stats.avgTime') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.variant">
                <th scope="row">{{ row.label }}</th>
                <td>{{ row.started }}</td>
                <td>{{ row.finished }}</td>
                <td>{{ row.best }}</td>
                <td v-if="game.statKind === 'time'">{{ row.average ?? '–' }}</td>
              </tr>
            </tbody>
          </table>
          <AppButton variant="ghost" icon="trash" @click="resetTarget = game.id">
            {{ t('stats.reset') }}
          </AppButton>
        </template>
      </section>
    </template>
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
.stats {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.empty {
  padding: var(--space-2) 0;
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
