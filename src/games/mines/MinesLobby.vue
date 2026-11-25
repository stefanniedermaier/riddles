<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import LobbyHero from '@/components/LobbyHero.vue'
import ContinueButton from '@/components/ContinueButton.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import RulesCard from '@/components/RulesCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { getStats, getVariantStats } from '@/core/stats'
import { load } from '@/core/storage'
import MinesRules from './MinesRules.vue'
import { DIFFICULTIES, SAVE_KEY, sizeLabel, type Difficulty } from './index'
import { isMinesSave } from './logic/types'
import { minesPool } from './pool'

const router = useRouter()

const saved = load(SAVE_KEY, null, (raw) => (isMinesSave(raw) ? raw : undefined))

/** First-time players see the rules first; afterwards they move below the menu. */
const hasPlayed = saved !== null || Object.values(getStats('mines')).some((s) => s.started > 0)

const savedLabel = computed(() => {
  if (!saved) return ''
  const { difficulty, width, height } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${t('mines.boardLabel', { width, height })} · ${formatDuration(saved.elapsedMs)}`
})

const items = computed(() =>
  DIFFICULTIES.map((difficulty) => {
    const best = getVariantStats('mines', difficulty).bestTimeMs
    return {
      id: difficulty,
      label: t(`difficulty.${difficulty}`),
      detail: sizeLabel(difficulty),
      meta: best !== undefined ? `${t('common.best')} ${formatDuration(best)}` : undefined,
    }
  }),
)

const pending = ref<Difficulty | null>(null)

function start(difficulty: Difficulty): void {
  void router.push({ name: 'mines-play', query: { new: difficulty } })
}

function onSelect(id: string): void {
  const difficulty = id as Difficulty
  if (saved) pending.value = difficulty
  else start(difficulty)
}

function resume(): void {
  void router.push({ name: 'mines-play' })
}

onMounted(() => minesPool.warm(DIFFICULTIES))
</script>

<template>
  <AppBar :title="t('mines.name')" back-to="/">
    <template #actions>
      <GameSettingsButton game="mines" />
    </template>
  </AppBar>

  <main class="page lobby" style="--lobby-accent: var(--game-mines)">
    <LobbyHero game="mines" />
    <RulesCard v-if="!hasPlayed" :title="t('mines.rules.title')" accent="var(--game-mines)">
      <MinesRules />
    </RulesCard>

    <ContinueButton v-if="saved" :detail="savedLabel" @click="resume" />

    <h2 class="section-title">{{ t('mines.lobby.newGame') }}</h2>
    <ChoiceList :items="items" @select="onSelect" />

    <RulesCard v-if="hasPlayed" class="rules--bottom" :title="t('mines.rules.title')" accent="var(--game-mines)">
      <MinesRules />
    </RulesCard>
  </main>

  <ConfirmDialog
    :open="pending !== null"
    :title="t('mines.lobby.confirmNewTitle')"
    :message="t('mines.lobby.confirmNew')"
    :confirm-label="t('mines.lobby.start')"
    @confirm="pending && start(pending)"
    @cancel="pending = null"
  />
</template>

<style scoped>
.rules--bottom {
  margin-top: var(--space-5);
}

</style>
