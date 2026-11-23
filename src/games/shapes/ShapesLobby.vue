<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import RulesCard from '@/components/RulesCard.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'
import { MODES, type Mode } from './logic/types'
import ShapesRules from './ShapesRules.vue'
import { levelProgress, loadRun } from './store'

const router = useRouter()

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = Object.fromEntries(MODES.map((mode) => [mode, loadRun(mode)])) as Record<
  Mode,
  ReturnType<typeof loadRun>
>

/** Players who already played see the instructions below the modes instead of above. */
const hasPlayed =
  MODES.some((mode) => getVariantStats('shapes', mode).started > 0 || saved[mode] !== null) ||
  levelProgress.value.level > 1

const items = computed(() =>
  MODES.map((mode) => {
    const run = saved[mode]
    const best = getVariantStats('shapes', mode).bestScore
    if (mode === 'levels') {
      const level = run?.level?.n ?? levelProgress.value.level
      return {
        id: mode,
        label: t('shapes.lobby.level', { level }),
        detail: run ? t('shapes.lobby.continueLevel', { level }) : t('shapes.modeInfo.levels'),
      }
    }
    return {
      id: mode,
      label: t(`shapes.modes.${mode}`),
      detail: run
        ? t('shapes.lobby.continue', { score: formatNumber(run.score) })
        : t(`shapes.modeInfo.${mode}`),
      meta: best !== undefined ? t('shapes.lobby.best', { score: formatNumber(best) }) : undefined,
    }
  }),
)

function select(id: string): void {
  const mode = id as Mode
  void router.push({
    name: 'shapes-play',
    params: { mode },
    query: saved[mode] ? {} : { new: '1' },
  })
}
</script>

<template>
  <AppBar :title="t('shapes.name')" back-to="/">
    <template #actions>
      <GameSettingsButton game="shapes" />
    </template>
  </AppBar>
  <main class="page lobby" :class="{ 'lobby--played': hasPlayed }">
    <RulesCard class="intro" :title="t('shapes.lobby.howToTitle')" accent="var(--game-shapes)">
      <ShapesRules />
    </RulesCard>
    <ChoiceList class="modes" :items="items" @select="select" />
  </main>
</template>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Returning players: modes first, instructions at the bottom. */
.lobby--played .intro {
  order: 2;
}
</style>
