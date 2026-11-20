<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'
import { MODES, type Mode } from './logic/types'
import ShapePiece from './ShapePiece.vue'
import { levelProgress, loadRun } from './store'

const router = useRouter()

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = Object.fromEntries(MODES.map((mode) => [mode, loadRun(mode)])) as Record<
  Mode,
  ReturnType<typeof loadRun>
>

const items = computed(() => {
  const list: { id: string; label: string; detail?: string; meta?: string }[] = []
  const savedLevel = saved.levels?.level?.n
  if (savedLevel !== undefined) {
    list.push({
      id: 'levels-continue',
      label: t('shapes.lobby.continueLevel', { level: savedLevel }),
      detail: t('shapes.modes.levels'),
    })
  }
  for (const mode of MODES) {
    const best = getVariantStats('shapes', mode).bestScore
    const run = saved[mode]
    list.push({
      id: mode,
      label: t(`shapes.modes.${mode}`),
      detail:
        run && mode !== 'levels'
          ? t('shapes.lobby.continue', { score: formatNumber(run.score) })
          : t(`shapes.modeInfo.${mode}`),
      meta:
        mode === 'levels'
          ? t('shapes.lobby.reached', { level: levelProgress.value.unlocked })
          : best !== undefined
            ? t('shapes.lobby.best', { score: formatNumber(best) })
            : undefined,
    })
  }
  return list
})

function select(id: string): void {
  if (id === 'levels-continue') {
    void router.push({ name: 'shapes-play', params: { mode: 'levels' } })
    return
  }
  if (id === 'levels') {
    void router.push({ name: 'shapes-levels' })
    return
  }
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
  <main class="page">
    <div class="intro">
      <div class="intro__art" aria-hidden="true">
        <ShapePiece :kind="0" special="none" />
        <ShapePiece :kind="4" special="line-h" />
        <ShapePiece :kind="3" special="burst" />
        <ShapePiece :kind="-1" special="prism" />
      </div>
      <p class="muted">{{ t('shapes.lobby.howTo') }}</p>
    </div>
    <ChoiceList :items="items" @select="select" />
  </main>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.intro__art {
  display: flex;
  gap: var(--space-2);
}

.intro__art > * {
  width: 40px;
  height: 40px;
}

.intro p {
  font-size: var(--text-sm);
}
</style>
