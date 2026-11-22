<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'
import { loadRun } from './store'

const router = useRouter()

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = loadRun()
const stats = getVariantStats('blocks', 'classic')
/** Players who already played see the instructions below the choices. */
const hasPlayed = stats.started > 0 || saved !== null

const items = computed(() => {
  const best = stats.bestScore !== undefined ? t('blocks.lobby.best', { score: formatNumber(stats.bestScore) }) : undefined
  const list = []
  if (saved) {
    list.push({
      id: 'continue',
      label: t('blocks.lobby.continue'),
      detail: t('blocks.lobby.continueDetail', { score: formatNumber(saved.score) }),
      meta: best,
    })
  }
  list.push({
    id: 'new',
    label: t('blocks.lobby.newGame'),
    detail: t('blocks.lobby.newGameDetail'),
    meta: saved ? undefined : best,
  })
  return list
})

const confirmNew = ref(false)

function start(): void {
  confirmNew.value = false
  void router.push({ name: 'blocks-play', query: { new: '1' } })
}

function select(id: string): void {
  if (id === 'continue') void router.push({ name: 'blocks-play' })
  else if (saved) confirmNew.value = true
  else start()
}
</script>

<template>
  <AppBar :title="t('blocks.name')" back-to="/" />
  <main class="page lobby" :class="{ 'lobby--played': hasPlayed }">
    <section class="intro card" :aria-label="t('blocks.lobby.howToTitle')">
      <h2 class="intro__title">{{ t('blocks.lobby.howToTitle') }}</h2>
      <p>{{ t('blocks.lobby.howTo') }}</p>
      <p>{{ t('blocks.lobby.howToScore') }}</p>
    </section>
    <ChoiceList :items="items" @select="select" />
  </main>

  <ConfirmDialog
    :open="confirmNew"
    :title="t('blocks.lobby.confirmNewTitle')"
    :message="t('blocks.lobby.confirmNew')"
    :confirm-label="t('blocks.lobby.start')"
    @confirm="start"
    @cancel="confirmNew = false"
  />
</template>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lobby--played .intro {
  order: 2;
}

.intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 4px solid var(--game-blocks);
}

.intro__title {
  font-size: var(--text-md);
  font-weight: 700;
}

.intro p {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
