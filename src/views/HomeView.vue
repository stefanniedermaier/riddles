<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import GameArt from '@/components/GameArt.vue'
import InstallButton from '@/components/InstallButton.vue'
import { t } from '@/core/i18n'
import { games } from '@/games/registry'

// Read once per visit – storage is not reactive, and the home view remounts on navigation.
const saved = Object.fromEntries(games.map((game) => [game.id, game.hasSavedGame()]))
</script>

<template>
  <AppBar>
    <template #title>
      <h1 class="brand">{{ t('app.name') }}</h1>
    </template>
    <template #actions>
      <RouterLink to="/stats" class="icon-btn" :aria-label="t('common.stats')">
        <AppIcon name="stats" />
      </RouterLink>
      <RouterLink to="/settings" class="icon-btn" :aria-label="t('common.settings')">
        <AppIcon name="settings" />
      </RouterLink>
    </template>
  </AppBar>

  <main class="page">
    <p class="tagline">{{ t('app.tagline') }}</p>
    <InstallButton />
    <ul class="games">
      <li v-for="game in games" :key="game.id">
        <RouterLink
          :to="`/${game.id}`"
          class="game-card"
          :style="{ '--card-accent': `var(--game-${game.id})` }"
        >
          <GameArt :game="game.id" />
          <span class="game-card__text">
            <span class="game-card__name">{{ t(`${game.id}.name`) }}</span>
            <span class="game-card__tagline">{{ t(`${game.id}.tagline`) }}</span>
          </span>
          <span v-if="saved[game.id]" class="game-card__badge">{{ t('home.continue') }}</span>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.brand {
  font-size: var(--text-xl) !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em;
}

.tagline {
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}

.games {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.game-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--card-accent) 14%, var(--color-surface));
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.game-card:active {
  transform: scale(0.985);
}

.game-card__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.game-card__name {
  font-size: var(--text-xl);
  font-weight: 800;
}

.game-card__tagline {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.game-card__badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--card-accent);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
}

:root[data-theme='dark'] .game-card__badge {
  color: var(--color-bg);
}
</style>
