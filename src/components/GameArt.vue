<script setup lang="ts">
import { computed, useId } from 'vue'

import { logoOf } from '@/games/logos'
import type { GameId } from '@/games/types'
import { ensureLogoDefs, LOGO_CLIPS, LOGO_GRADIENT_IDS, type LogoIds } from './logoIds'

/**
 * A game's logo: the game's own motif (`src/games/<id>/Logo.vue`) with a glaze on top. The
 * gradients are shared by all logos on the page (`logoIds.ts`).
 */
const props = defineProps<{ game: GameId }>()

const logo = computed(() => logoOf(props.game))

ensureLogoDefs()
/** Shared gradient ids plus this logo's own clip path ids (unique on the page). */
const uid = useId()
const ids: LogoIds = {
  ...LOGO_GRADIENT_IDS,
  ...(Object.fromEntries(LOGO_CLIPS.map((name) => [name, `art-${name}-${uid}`])) as Record<
    (typeof LOGO_CLIPS)[number],
    string
  >),
}
</script>

<template>
  <svg class="game-art" viewBox="0 0 64 64" aria-hidden="true">
    <component :is="logo" :ids="ids" />
    <!-- A soft glaze on the top half of every logo (one look for all games). -->
    <path d="M4 4h56v18Q32 30 4 22z" :fill="`url(#${ids.glaze})`" class="game-art__glaze" />
  </svg>
</template>

<style scoped>
:root[data-theme='dark'] .game-art__glaze {
  opacity: 0.35;
}

/* Inside a forced light theme (shared result image) the glaze stays at full strength. */
:root[data-theme] .theme-light .game-art__glaze {
  opacity: 1;
}

.game-art {
  display: block;
  width: 72px;
  height: 72px;
  flex: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 12%));
}
</style>
