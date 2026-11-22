<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import AppButton from '@/components/AppButton.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { getStats, getVariantStats } from '@/core/stats'
import { load } from '@/core/storage'
import NonogramRules from './NonogramRules.vue'
import { DIFFICULTIES, SAVE_KEY, sizeLabel, type Difficulty } from './index'
import { isNonogramSave } from './logic/types'
import { nonogramPool } from './pool'

const router = useRouter()

const saved = load(SAVE_KEY, null, (raw) => (isNonogramSave(raw) ? raw : undefined))

/** First-time players see the rules first; afterwards they move below the menu. */
const hasPlayed = saved !== null || Object.values(getStats('nonogram')).some((s) => s.started > 0)

const savedLabel = computed(() => {
  if (!saved) return ''
  const { difficulty, width, height } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${t('nonogram.sizeLabel', { width, height })} · ${formatDuration(saved.elapsedMs)}`
})

const items = computed(() =>
  DIFFICULTIES.map((difficulty) => {
    const best = getVariantStats('nonogram', difficulty).bestTimeMs
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
  void router.push({ name: 'nonogram-play', query: { new: difficulty } })
}

function onSelect(id: string): void {
  const difficulty = id as Difficulty
  if (saved) pending.value = difficulty
  else start(difficulty)
}

function resume(): void {
  void router.push({ name: 'nonogram-play' })
}

onMounted(() => nonogramPool.warm(DIFFICULTIES))
</script>

<template>
  <AppBar :title="t('nonogram.name')" back-to="/">
    <template #actions>
      <GameSettingsButton game="nonogram" />
    </template>
  </AppBar>

  <main class="page lobby">
    <section v-if="!hasPlayed" class="card rules">
      <h2 class="rules__title">{{ t('nonogram.rules.title') }}</h2>
      <NonogramRules />
    </section>

    <div v-if="saved" class="resume">
      <AppButton variant="primary" icon="play" block @click="resume">
        {{ t('common.continue') }}
      </AppButton>
      <p class="resume__info muted tabular">{{ savedLabel }}</p>
    </div>

    <h2 class="section-title">{{ t('nonogram.lobby.newGame') }}</h2>
    <ChoiceList :items="items" @select="onSelect" />

    <section v-if="hasPlayed" class="card rules rules--bottom">
      <h2 class="rules__title">{{ t('nonogram.rules.title') }}</h2>
      <NonogramRules />
    </section>
  </main>

  <ConfirmDialog
    :open="pending !== null"
    :title="t('nonogram.lobby.confirmNewTitle')"
    :message="t('nonogram.lobby.confirmNew')"
    :confirm-label="t('nonogram.lobby.start')"
    @confirm="pending && start(pending)"
    @cancel="pending = null"
  />
</template>

<style scoped>
.rules {
  padding: var(--space-4);
  border-top: 4px solid var(--game-nonogram);
}

.rules--bottom {
  margin-top: var(--space-5);
}

.rules__title {
  margin-bottom: var(--space-2);
  font-size: var(--text-md);
  font-weight: 700;
}

.resume {
  margin-top: var(--space-4);
}

.resume:first-child {
  margin-top: 0;
}

.resume__info {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  text-align: center;
}
</style>
