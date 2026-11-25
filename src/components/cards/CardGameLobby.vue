<script setup lang="ts" generic="S, M, V extends string">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import LobbyHero from '@/components/LobbyHero.vue'
import ContinueButton from '@/components/ContinueButton.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import RulesCard from '@/components/RulesCard.vue'
import { formatDuration, formatNumber } from '@/core/format'
import { gameName, t } from '@/core/i18n'
import { useChallengeVariant } from '@/core/share'
import { getStats, getVariantStats } from '@/core/stats'
import { cardSaveKey } from '@/core/cards/game'
import { has } from '@/core/storage'
import type { CardGameDef } from './types'

/** Lobby shared by the card games: continue, variants with best values, rules. */
const props = defineProps<{ game: CardGameDef<S, M, V> }>()

const router = useRouter()
const challenge = useChallengeVariant()
const hasSave = has(cardSaveKey(props.game.id))
const hasPlayed = hasSave || Object.values(getStats(props.game.id)).some((s) => s.started > 0)
const points = computed(() => props.game.settings.value.scoring === 'points')

const items = computed(() =>
  props.game.rules.variants.map((variant) => {
    const stats = getVariantStats(props.game.id, variant)
    const best = points.value
      ? stats.bestScore !== undefined
        ? `${t('stats.bestScore')} ${formatNumber(stats.bestScore)}`
        : undefined
      : stats.bestTimeMs !== undefined
        ? `${t('common.best')} ${formatDuration(stats.bestTimeMs)}`
        : undefined
    return {
      id: variant,
      label: props.game.variantLabel(variant),
      detail: stats.finished ? t('cards.lobby.won', { n: stats.finished }) : undefined,
      meta: best,
    }
  }),
)

const pending = ref<V | null>(null)

function start(variant: V): void {
  void router.push({ name: `${props.game.id}-play`, query: { new: variant } })
}

function onSelect(id: string): void {
  if (hasSave) pending.value = id as V
  else start(id as V)
}

onMounted(() => props.game.warm?.())
</script>

<template>
  <AppBar :title="gameName(game.id)" back-to="/">
    <template #actions>
      <GameSettingsButton :game="game.id" />
    </template>
  </AppBar>

  <main class="page lobby" :style="{ '--lobby-accent': 'var(--game-' + game.id + ')' }">
    <LobbyHero :game="game.id" />
    <RulesCard v-if="!hasPlayed" :title="t('cards.play.rules')" :accent="`var(--game-${game.id})`">
      <ul class="rules">
        <li v-for="key in game.rulesKeys" :key="key">{{ t(key) }}</li>
      </ul>
    </RulesCard>

    <ContinueButton v-if="hasSave" @click="router.push({ name: `${game.id}-play` })" />

    <h2 class="section-title">{{ t('common.newGame') }}</h2>
    <ChoiceList :items="items" :highlight="challenge" @select="onSelect" />

    <RulesCard v-if="hasPlayed" class="rules--bottom" :title="t('cards.play.rules')" :accent="`var(--game-${game.id})`">
      <ul class="rules">
        <li v-for="key in game.rulesKeys" :key="key">{{ t(key) }}</li>
      </ul>
    </RulesCard>
  </main>

  <ConfirmDialog
    :open="pending !== null"
    :title="t('common.confirmNewTitle')"
    :message="t('common.confirmNew')"
    :confirm-label="t('common.start')"
    @confirm="pending && start(pending)"
    @cancel="pending = null"
  />
</template>

<style scoped>
.rules--bottom {
  margin-top: var(--space-5);
}

.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}
</style>
