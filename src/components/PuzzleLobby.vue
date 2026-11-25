<script setup lang="ts" generic="S extends { elapsedMs: number }, V extends string">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ContinueButton from '@/components/ContinueButton.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import LobbyHero from '@/components/LobbyHero.vue'
import RulesCard from '@/components/RulesCard.vue'
import { formatDuration } from '@/core/format'
import { gameName, t } from '@/core/i18n'
import type { SaveSlot } from '@/core/saveSlot'
import { useChallengeVariant } from '@/core/share'
import { getStats, getVariantStats } from '@/core/stats'
import type { GameId } from '@/games/types'

/**
 * Lobby of a puzzle game with one variant list (difficulties): continue the running game,
 * start a new one (with a confirm when that replaces the running game), best times, rules.
 * The rules content goes into the `rules` slot. Routes: `<game>` and `<game>-play`.
 */
const props = defineProps<{
  game: GameId
  variants: readonly V[]
  save: SaveSlot<S>
  /** Text of the continue button for the stored game. */
  savedLabel: (saved: S) => string
  /** Second line of a variant (board size etc.). */
  variantDetail: (variant: V) => string
  /** Called once the lobby is shown, e.g. to prefetch puzzles. */
  warm?: () => void
}>()

defineSlots<{ rules(): unknown }>()

const router = useRouter()
const challenge = useChallengeVariant()

const saved = props.save.load()

/** First-time players see the rules first; afterwards they move below the menu. */
const hasPlayed = saved !== null || Object.values(getStats(props.game)).some((s) => s.started > 0)

const accent = `var(--game-${props.game})`
const name = computed(() => gameName(props.game))
const rulesTitle = computed(() => t(`${props.game}.rules.title` as 'sudoku.rules.title'))
const continueLabel = computed(() => (saved ? props.savedLabel(saved) : ''))

const items = computed(() =>
  props.variants.map((variant) => {
    const best = getVariantStats(props.game, variant).bestTimeMs
    return {
      id: variant,
      label: t(`difficulty.${variant}` as 'difficulty.easy'),
      detail: props.variantDetail(variant),
      meta: best !== undefined ? `${t('common.best')} ${formatDuration(best)}` : undefined,
    }
  }),
)

const pending = ref<V | null>(null)

function start(variant: V): void {
  void router.push({ name: `${props.game}-play`, query: { new: variant } })
}

function onSelect(id: string): void {
  const variant = id as V
  if (saved) pending.value = variant
  else start(variant)
}

function resume(): void {
  void router.push({ name: `${props.game}-play` })
}

onMounted(() => props.warm?.())
</script>

<template>
  <AppBar :title="name" back-to="/">
    <template #actions>
      <GameSettingsButton :game="game" />
    </template>
  </AppBar>

  <main class="page lobby" :style="{ '--lobby-accent': accent }">
    <LobbyHero :game="game" />
    <RulesCard v-if="!hasPlayed" :title="rulesTitle" :accent="accent">
      <slot name="rules" />
    </RulesCard>

    <ContinueButton v-if="saved" :detail="continueLabel" @click="resume" />

    <h2 class="section-title">{{ t('common.newGame') }}</h2>
    <ChoiceList :items="items" :highlight="challenge" @select="onSelect" />

    <RulesCard v-if="hasPlayed" class="rules--bottom" :title="rulesTitle" :accent="accent">
      <slot name="rules" />
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
</style>
