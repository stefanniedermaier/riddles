<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import RulesCard from '@/components/RulesCard.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'
import { VARIANTS, type Variant } from './index'
import MergeRules from './MergeRules.vue'
import { targetOf } from './logic/engine'
import { loadRun, records } from './store'

const router = useRouter()

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = Object.fromEntries(VARIANTS.map((variant) => [variant, loadRun(variant)])) as Record<
  Variant,
  ReturnType<typeof loadRun>
>

/** Players who already played see the instructions below the list instead of above. */
const hasPlayed = VARIANTS.some(
  (variant) => getVariantStats('merge', variant).started > 0 || saved[variant] !== null,
)

const items = computed(() =>
  VARIANTS.map((variant) => {
    const run = saved[variant]
    const best = getVariantStats('merge', variant).bestScore
    const highest = records.value[variant]
    const meta = [
      best !== undefined ? t('merge.lobby.best', { score: formatNumber(best) }) : null,
      highest > 0 ? t('merge.lobby.highest', { value: formatNumber(highest) }) : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      id: variant,
      label: t(`merge.variants.${variant}`),
      detail: run
        ? t('merge.lobby.continue', { score: formatNumber(run.score) })
        : t('merge.lobby.target', { target: formatNumber(targetOf(variant)) }),
      meta: meta || undefined,
    }
  }),
)

function select(id: string): void {
  const variant = id as Variant
  void router.push({
    name: 'merge-play',
    params: { variant },
    query: saved[variant] ? {} : { new: '1' },
  })
}
</script>

<template>
  <AppBar :title="t('merge.name')" back-to="/" />
  <main class="page lobby" :class="{ 'lobby--played': hasPlayed }">
    <RulesCard class="intro" :title="t('merge.lobby.howToTitle')" accent="var(--game-merge)">
      <MergeRules />
    </RulesCard>
    <ChoiceList class="variants" :items="items" @select="select" />
  </main>
</template>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Returning players: variants first, instructions at the bottom. */
.lobby--played .intro {
  order: 2;
}
</style>
