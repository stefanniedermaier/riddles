<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'
import { ITEM_KIND, MODES, type Mode } from './logic/types'
import ObstacleArt from './ObstacleArt.vue'
import ShapePiece from './ShapePiece.vue'
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
  <AppBar :title="t('shapes.name')" back-to="/" />
  <main class="page lobby" :class="{ 'lobby--played': hasPlayed }">
    <section class="intro" :aria-label="t('shapes.lobby.howToTitle')">
      <h2 v-if="hasPlayed" class="section-title">{{ t('shapes.lobby.howToTitle') }}</h2>
      <div class="intro__art" aria-hidden="true">
        <ShapePiece :kind="0" special="none" />
        <ShapePiece :kind="4" special="line-h" />
        <ShapePiece :kind="3" special="burst" />
        <ShapePiece :kind="-1" special="prism" />
      </div>
      <p class="muted">{{ t('shapes.lobby.howTo') }}</p>
      <div class="intro__art" aria-hidden="true">
        <span class="intro__tile"><ObstacleArt type="target" /></span>
        <span class="intro__tile intro__tile--stack">
          <ShapePiece :kind="2" special="none" />
          <ObstacleArt type="chain" />
        </span>
        <span class="intro__tile"><ObstacleArt type="crate" /></span>
        <span class="intro__tile"><ShapePiece :kind="ITEM_KIND" special="none" /></span>
      </div>
      <p class="muted">{{ t('shapes.lobby.howToLevels') }}</p>
    </section>
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

.intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro .section-title {
  margin: 0;
}

.intro__art {
  display: flex;
  gap: var(--space-2);
}

.intro__art > * {
  width: 40px;
  height: 40px;
}

.intro__tile {
  display: block;
}

.intro__tile--stack {
  position: relative;
}

.intro__tile--stack > :deep(svg) {
  position: absolute;
  inset: 0;
}

.intro p {
  font-size: var(--text-sm);
}
</style>
