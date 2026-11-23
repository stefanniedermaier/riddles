<script setup lang="ts">
import { t } from '@/core/i18n'
import { ITEM_KIND } from './logic/types'
import ObstacleArt from './ObstacleArt.vue'
import ShapePiece from './ShapePiece.vue'

/** How to play Shapes (shown in the lobby expander and in the in-game rules dialog). */
</script>

<template>
  <div class="intro__content">
  <div class="intro__art" aria-hidden="true">
    <ShapePiece :kind="0" special="none" />
    <ShapePiece :kind="4" special="line-h" />
    <ShapePiece :kind="3" special="burst" />
    <ShapePiece :kind="-1" special="prism" />
  </div>
  <p class="muted">{{ t('shapes.lobby.howTo') }}</p>
  <div class="intro__art" aria-hidden="true">
    <span class="intro__tile"><ObstacleArt type="target" /></span>
    <span class="intro__tile intro__tile--stack">
      <ShapePiece :kind="2" special="none" />
      <ObstacleArt type="chain" />
    </span>
    <span class="intro__tile"><ObstacleArt type="crate" /></span>
    <span class="intro__tile"><ShapePiece :kind="ITEM_KIND" special="none" /></span>
  </div>
  <p class="muted">{{ t('shapes.lobby.howToLevels') }}</p>
  </div>
</template>

<style scoped>
.intro__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro__art {
  display: flex;
  gap: var(--space-2);
}

.intro__art > * {
  width: 40px;
  height: 40px;
}

.intro__tile {
  display: block;
}

.intro__tile--stack {
  position: relative;
}

.intro__tile--stack > :deep(svg) {
  position: absolute;
  inset: 0;
}

.intro__content p {
  font-size: var(--text-sm);
}
</style>
