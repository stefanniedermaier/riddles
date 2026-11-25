<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import LobbyHero from '@/components/LobbyHero.vue'
import ContinueButton from '@/components/ContinueButton.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import RulesCard from '@/components/RulesCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { getVariantStats } from '@/core/stats'
import BlocksRules from './BlocksRules.vue'
import { loadRun } from './store'

const router = useRouter()
/** A challenge link names the only variant (`classic`); its entry here is "New game". */
const challenged = useRoute().query.challenge === 'classic'

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = loadRun()
const stats = getVariantStats('blocks', 'classic')
/** Players who already played see the instructions below the choices. */
const hasPlayed = stats.started > 0 || saved !== null

const items = computed(() => {
  const best = stats.bestScore !== undefined ? t('blocks.lobby.best', { score: formatNumber(stats.bestScore) }) : undefined
  return [
    {
      id: 'new',
      label: t('common.newGame'),
      detail: t('blocks.lobby.newGameDetail'),
      meta: best,
    },
  ]
})

const confirmNew = ref(false)

function start(): void {
  confirmNew.value = false
  void router.push({ name: 'blocks-play', query: { new: '1' } })
}

/** The only choice is a new game (continuing has its own button). */
function select(): void {
  if (saved) confirmNew.value = true
  else start()
}
</script>

<template>
  <AppBar :title="t('blocks.name')" back-to="/" />
  <main class="page lobby" style="--lobby-accent: var(--game-blocks)" :class="{ 'lobby--played': hasPlayed }">
    <LobbyHero game="blocks" />
    <RulesCard class="intro" :title="t('blocks.lobby.howToTitle')" accent="var(--game-blocks)">
      <BlocksRules />
    </RulesCard>
    <div class="choices-group">
      <ContinueButton
        v-if="saved"
        :label="t('blocks.lobby.continue')"
        :detail="t('blocks.lobby.continueDetail', { score: formatNumber(saved.score) })"
        @click="router.push({ name: 'blocks-play' })"
      />
      <ChoiceList :items="items" :highlight="challenged ? 'new' : undefined" @select="select" />
    </div>
  </main>

  <ConfirmDialog
    :open="confirmNew"
    :title="t('common.confirmNewTitle')"
    :message="t('common.confirmNew')"
    :confirm-label="t('common.start')"
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

.choices-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lobby--played .intro {
  order: 2;
}
</style>
