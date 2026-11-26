<script setup lang="ts">
import { computed } from 'vue'

import GameArt from '@/components/GameArt.vue'
import { games } from '@/games/registry'
import { gameName, t } from '@/core/i18n'
import { settings } from '@/core/settings'
import type { GameId } from '@/games/types'

const props = defineProps<{ game: string; locale: 'en' | 'de' }>()

settings.value.locale = props.locale
const isApp = computed(() => props.game === 'app')
const id = computed(() => props.game as GameId)
const accent = computed(() => (isApp.value ? 'var(--color-accent)' : `var(--game-${props.game})`))
/** The app logo from public/ (served below the base path). */
const logoUrl = `${import.meta.env.BASE_URL}logo.svg`
/** The app card shows a grid of game logos. */
const gridGames = games.slice(0, 9).map((game) => game.id)
</script>

<template>
  <div class="card" :style="{ '--card-accent': accent }">
    <div class="card__art">
      <template v-if="isApp">
        <div class="card__grid">
          <GameArt v-for="g in gridGames" :key="g" :game="g" :style="{ width: '104px', height: '104px' }" />
        </div>
      </template>
      <!-- Inline size: GameArt brings its own (scoped) size. -->
      <GameArt v-else :game="id" :style="{ width: '300px', height: '300px' }" />
    </div>
    <div class="card__text">
      <p class="card__brand"><img :src="logoUrl" alt="" class="card__app-logo" /> Riddles</p>
      <h1 class="card__name">{{ isApp ? t('seo.cardTitle') : gameName(id) }}</h1>
      <p class="card__claim">{{ t('seo.cardClaim') }}</p>
    </div>
  </div>
</template>
