<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ChoiceList from '@/components/ChoiceList.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import LobbyHero from '@/components/LobbyHero.vue'
import RulesCard from '@/components/RulesCard.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { useChallengeVariant } from '@/core/share'
import { getVariantStats } from '@/core/stats'
import BubblesRules from './BubblesRules.vue'
import { VARIANTS, type Variant } from './index'
import { chosenSpeed, speedOptions } from './options'
import { bestTimeSpeed, levelProgress, loadRun, totalStars } from './store'

const router = useRouter()
const challenge = useChallengeVariant()

// Storage is not reactive; the lobby remounts on every visit, so reading once is enough.
const saved = Object.fromEntries(VARIANTS.map((variant) => [variant, loadRun(variant)])) as Record<
  Variant,
  ReturnType<typeof loadRun>
>

/** Players who already played see the instructions below the list instead of above. */
const hasPlayed =
  VARIANTS.some((variant) => getVariantStats('bubbles', variant).started > 0 || saved[variant] !== null) ||
  levelProgress.value.level > 1

const items = computed(() =>
  VARIANTS.map((variant) => {
    const run = saved[variant]
    const best = getVariantStats('bubbles', variant).bestScore
    if (variant === 'levels') {
      const level = run?.level ?? levelProgress.value.level
      const stars = totalStars()
      return {
        id: variant,
        label: `${t('bubbles.variants.levels')} · ${t('bubbles.lobby.level', { level })}`,
        detail: run ? t('bubbles.lobby.continueLevel', { level }) : t('bubbles.variantDetails.levels'),
        meta: stars > 0 ? t('bubbles.lobby.stars', { stars: formatNumber(stars) }) : undefined,
      }
    }
    const score = best !== undefined ? formatNumber(best) : ''
    const speed = variant === 'time' ? bestTimeSpeed.value.speed : null
    return {
      id: variant,
      label: t(`bubbles.variants.${variant}`),
      detail: run ? t('bubbles.lobby.continue', { score: formatNumber(run.score) }) : t(`bubbles.variantDetails.${variant}`),
      meta:
        best === undefined
          ? undefined
          : speed
            ? t('bubbles.lobby.bestSpeed', { score, speed: t(`bubbles.speeds.${speed}`) })
            : t('bubbles.lobby.best', { score }),
    }
  }),
)

function select(id: string): void {
  const variant = id as Variant
  void router.push({
    name: 'bubbles-play',
    params: { variant },
    query: saved[variant] ? {} : { new: '1' },
  })
}
</script>

<template>
  <AppBar :title="t('bubbles.name')" back-to="/">
    <template #actions>
      <GameSettingsButton game="bubbles" />
    </template>
  </AppBar>
  <main class="page lobby" style="--lobby-accent: var(--game-bubbles)" :class="{ 'lobby--played': hasPlayed }">
    <LobbyHero game="bubbles" />
    <RulesCard class="intro" :title="t('bubbles.lobby.howToTitle')" accent="var(--game-bubbles)">
      <BubblesRules />
    </RulesCard>
    <ChoiceList class="variants" :items="items" :highlight="challenge" @select="select" />
    <section class="card speed">
      <span class="speed__label">{{ t('bubbles.lobby.speed') }}</span>
      <SegmentedControl v-model="chosenSpeed" :options="speedOptions" :label="t('bubbles.lobby.speed')" />
    </section>
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
