<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'

import { gameName, gameTagline, t } from '@/core/i18n'
import { parseChallenge, useCurrentRoute } from '@/core/share'
import type { GameDescriptor, GameId } from '@/games/types'
import GameBackdrop from './GameBackdrop.vue'
import AppIcon from './AppIcon.vue'
import GameArt from './GameArt.vue'

/**
 * Colourful header of a game's lobby: a banner in the game's colour with its illustration,
 * name and tagline, small copies of the illustration scattered around – and, unless `tint`
 * is off, a page background in the game's colour with a motif that fits the game (a grid
 * for Sudoku, felt for card games, bubbles for Water Sort, …).
 *
 * The lobby's `<main class="page lobby">` sits above the background (see base.css).
 */
const props = withDefaults(defineProps<{ game: GameId; tint?: boolean }>(), { tint: true })

/** Positions (%), sizes (px) and rotations of the small illustrations. */
const FLOATERS = [
  { x: 6, y: 14, size: 34, rot: -18 },
  { x: 84, y: 8, size: 40, rot: 14 },
  { x: 72, y: 62, size: 30, rot: -8 },
  { x: 92, y: 58, size: 26, rot: 22 },
  { x: 2, y: 66, size: 28, rot: 10 },
]

/** Card games share one felt table look. */
const CARD_GAMES = new Set<string>(['solitaire', 'spider', 'freecell', 'tripeaks'])
const theme = computed(() => (CARD_GAMES.has(props.game) ? 'cards' : props.game))
const color = computed(() => `var(--game-${props.game})`)

/** A challenge from a shared result link (`?challenge=<variant>&result=…`). */
const route = useCurrentRoute()
/**
 * The registry is loaded lazily: it imports every game module, and those import this lobby
 * component – a static import would be circular.
 */
const descriptor = shallowRef<GameDescriptor | null>(null)
onMounted(async () => {
  if (typeof route.value?.query.challenge !== 'string') return
  const { games } = await import('@/games/registry')
  descriptor.value = games.find((candidate) => candidate?.id === props.game) ?? null
})
const challenge = computed(() => {
  const game = descriptor.value
  const query = route.value?.query
  if (!game || !query) return null
  const parsed = parseChallenge(query, game.variants)
  if (!parsed) return null
  const params = { variant: game.variantLabel(parsed.variant), result: parsed.result ?? '' }
  const text = !parsed.result
    ? t('challenge.plain', params)
    : parsed.kind === 'score' || !parsed.result.includes(':')
      ? t('challenge.score', params)
      : t('challenge.time', params)
  return { text }
})
</script>

<template>
  <GameBackdrop v-if="tint" :game="game" />
  <section class="hero" :data-theme-game="theme" :style="{ '--hero': color }">
    <div class="hero__floaters" aria-hidden="true">
      <span
        v-for="(f, i) in FLOATERS"
        :key="i"
        class="hero__floater"
        :style="{
          left: `${f.x}%`,
          top: `${f.y}%`,
          width: `${f.size}px`,
          height: `${f.size}px`,
          '--rot': `${f.rot}deg`,
        }"
      >
        <GameArt :game="game" />
      </span>
    </div>
    <div class="hero__badge" aria-hidden="true">
      <GameArt :game="game" />
    </div>
    <div class="hero__text">
      <h2 class="hero__title">{{ gameName(game) }}</h2>
      <p class="hero__tagline">{{ gameTagline(game) }}</p>
    </div>
  </section>
  <section v-if="challenge" class="challenge" :style="{ '--hero': color }" role="status">
    <AppIcon name="trophy" :size="26" class="challenge__icon" />
    <div>
      <p class="challenge__title">{{ t('challenge.title') }}</p>
      <p class="challenge__text">{{ challenge.text }}</p>
      <p class="challenge__hint">{{ t('challenge.hint') }}</p>
    </div>
  </section>
</template>

<style scoped>
/* --- Banner ----------------------------------------------------------------------- */

.hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-height: 132px;
  margin-bottom: var(--space-4);
  padding: var(--space-4) var(--space-5);
  overflow: hidden;
  border-radius: 0;
  background:
    radial-gradient(circle at 85% 0%, rgb(255 255 255 / 28%), transparent 55%),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--hero) 78%, #fff),
      var(--hero) 50%,
      color-mix(in srgb, var(--hero) 72%, #000)
    );
  /* Material: flat colour on elevation 2. */
  box-shadow: var(--elevation-2);
  color: var(--on-hero);
}

/* --- Challenge from a shared link ---------------------------------------------------- */

.challenge {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-left: 6px solid var(--hero);
  background: color-mix(in srgb, var(--hero) 12%, var(--color-surface));
  box-shadow: var(--shadow-sm);
}

.challenge__icon {
  flex: none;
  color: var(--gold-deep);
}

.challenge__title {
  font-weight: 900;
}

.challenge__text {
  font-weight: 600;
}

.challenge__hint {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Dark mode: the game colours are light there – darken the banner for white text. */
:root[data-theme='dark'] .hero:not([data-theme-game='cards']) {
  background:
    radial-gradient(circle at 85% 0%, rgb(255 255 255 / 18%), transparent 55%),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--hero) 70%, #000),
      color-mix(in srgb, var(--hero) 50%, #000) 55%,
      color-mix(in srgb, var(--hero) 32%, #000)
    );
}

.hero[data-theme-game='cards'] {
  background:
    radial-gradient(circle at 85% 0%, rgb(255 255 255 / 22%), transparent 55%),
    radial-gradient(ellipse at 50% 120%, #145c33, transparent 70%),
    linear-gradient(135deg, #2f9a5c, #1f7a46 55%, #145c33);
}

.hero__floaters {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero__floater {
  position: absolute;
  opacity: 0.22;
  transform: rotate(var(--rot));
}

.hero__floater :deep(.game-art) {
  width: 100%;
  height: 100%;
  filter: none;
}

.hero__badge {
  position: relative;
  flex: none;
  padding: 8px;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  box-shadow: var(--elevation-2);
  transform: rotate(-6deg);
}

.hero__badge :deep(.game-art) {
  width: 76px;
  height: 76px;
}

.hero__text {
  position: relative;
  min-width: 0;
}

.hero__title {
  font-size: var(--text-2xl);
  font-weight: 900;
  line-height: 1.1;
  text-shadow: 0 2px 0 rgb(0 0 0 / 22%);
}

.hero__tagline {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.35;
  opacity: 0.95;
  text-shadow: 0 1px 0 rgb(0 0 0 / 18%);
}

</style>
