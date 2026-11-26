<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import LobbyHero from '@/components/LobbyHero.vue'
import RulesCard from '@/components/RulesCard.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { useChallengeVariant } from '@/core/share'
import { getVariantStats } from '@/core/stats'
import { VARIANTS, type Variant } from './index'
import SnakeRules from './SnakeRules.vue'
import { chosenSpeed, speedOptions } from './speeds'
import { bestSpeeds, loadRun } from './store'

const router = useRouter()
const challenge = useChallengeVariant()

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = Object.fromEntries(VARIANTS.map((variant) => [variant, loadRun(variant)])) as Record<
  Variant,
  ReturnType<typeof loadRun>
>

/** Players who already played see the instructions below the list instead of above. */
const hasPlayed = VARIANTS.some(
  (variant) => getVariantStats('snake', variant).started > 0 || saved[variant] !== null,
)

const items = computed(() =>
  VARIANTS.map((variant) => {
    const run = saved[variant]
    const best = getVariantStats('snake', variant).bestScore
    const bestSpeed = bestSpeeds.value[variant]
    const score = best !== undefined ? formatNumber(best) : ''
    return {
      id: variant,
      label: t(`snake.variants.${variant}`),
      detail: run
        ? t('snake.lobby.continue', { score: formatNumber(run.score), speed: t(`snake.speeds.${run.speed}`) })
        : t(`snake.variantDetails.${variant}`),
      meta:
        best === undefined
          ? undefined
          : bestSpeed
            ? t('snake.lobby.best', { score, speed: t(`snake.speeds.${bestSpeed}`) })
            : t('snake.lobby.bestPlain', { score }),
    }
  }),
)

function select(id: string): void {
  const variant = id as Variant
  void router.push({
    name: 'snake-play',
    params: { variant },
    query: saved[variant] ? {} : { new: '1' },
  })
}
</script>

<template>
  <AppBar :title="t('snake.name')" back-to="/" />
  <main class="page lobby" style="--lobby-accent: var(--game-snake)" :class="{ 'lobby--played': hasPlayed }">
    <LobbyHero game="snake" />
    <RulesCard class="intro" :title="t('snake.lobby.howToTitle')" accent="var(--game-snake)">
      <SnakeRules />
    </RulesCard>
    <section class="card speed">
      <span class="speed__label">{{ t('snake.lobby.speed') }}</span>
      <SegmentedControl v-model="chosenSpeed" :options="speedOptions" :label="t('snake.lobby.speed')" />
    </section>
    <ChoiceList class="variants" :items="items" :highlight="challenge" @select="select" />
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

.speed {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.speed__label {
  font-size: var(--text-sm);
  font-weight: 700;
}
</style>
