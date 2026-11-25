<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import GameArt from '@/components/GameArt.vue'
import InstallButton from '@/components/InstallButton.vue'
import { t } from '@/core/i18n'
import { appUrl, isApplePlatform, shareApp } from '@/core/share'
import { showToast } from '@/core/toast'
import { visibleGames } from '@/games/layout'

// Read once per visit – storage is not reactive, and the home view remounts on navigation.
const saved = Object.fromEntries(visibleGames.value.map((game) => [game.id, game.hasSavedGame()]))

/** Share icon in the style of the user's operating system. */
const shareIcon = isApplePlatform() ? 'share' : 'shareNodes'

async function share(): Promise<void> {
  const outcome = await shareApp(t('app.name'), t('share.text'))
  if (outcome === 'copied') showToast(t('share.copied'))
  else if (outcome === 'failed') showToast(t('share.failed', { url: appUrl() }), 6000)
}
</script>

<template>
  <AppBar>
    <template #title>
      <h1 class="brand">{{ t('app.name') }}</h1>
    </template>
    <template #actions>
      <button type="button" class="icon-btn" :aria-label="t('share.button')" @click="share">
        <AppIcon :name="shareIcon" />
      </button>
      <RouterLink to="/stats" class="icon-btn" :aria-label="t('common.stats')">
        <AppIcon name="stats" />
      </RouterLink>
      <RouterLink to="/settings" class="icon-btn" :aria-label="t('common.settings')">
        <AppIcon name="settings" />
      </RouterLink>
    </template>
  </AppBar>

  <main class="page">
    <InstallButton />
    <ul class="games">
      <li v-for="game in visibleGames" :key="game.id">
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
    <footer class="footer">
      <RouterLink to="/privacy" class="footer__link">{{ t('privacy.link') }}</RouterLink>
      <span class="footer__sep" aria-hidden="true">·</span>
      <RouterLink to="/imprint" class="footer__link">{{ t('imprint.link') }}</RouterLink>
    </footer>
  </main>
</template>

<style scoped>
.brand {
  font-size: var(--text-xl) !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em;
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
  border-radius: 0;
  background: color-mix(in srgb, var(--card-accent) 14%, var(--color-surface));
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
  text-decoration: none;
  transition: box-shadow var(--dur-fast) var(--ease-standard);
}

@media (hover: hover) {
  .game-card:hover {
    box-shadow: var(--elevation-2);
  }
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
  border-radius: 0;
  background: var(--card-accent);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
}

:root[data-theme='dark'] .game-card__badge {
  color: var(--color-bg);
}

.footer {
  margin-top: var(--space-6);
  text-align: center;
}

.footer__link,
.footer__sep {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.footer__sep {
  margin: 0 var(--space-2);
}
</style>
