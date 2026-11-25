<script setup lang="ts">
import { t } from '@/core/i18n'
import { ITEM_KIND } from './logic/types'
import ObstacleArt from './ObstacleArt.vue'
import ShapePiece from './ShapePiece.vue'

/**
 * How to play Shapes (shown in the lobby expander and in the in-game rules dialog): the
 * basic rule, then labelled tiles for the special pieces and the level obstacles.
 */
</script>

<template>
  <div class="rules">
    <div class="rules__demo" aria-hidden="true">
      <span class="rules__fruit"><ShapePiece :kind="0" special="none" /></span>
      <span class="rules__fruit rules__fruit--swap"><ShapePiece :kind="2" special="none" /></span>
      <span class="rules__fruit"><ShapePiece :kind="0" special="none" /></span>
      <span class="rules__fruit"><ShapePiece :kind="0" special="none" /></span>
    </div>
    <p class="rules__text">{{ t('shapes.lobby.howTo') }}</p>

    <h3 class="rules__heading">{{ t('shapes.rules.specialsTitle') }}</h3>
    <ul class="rules__grid">
      <li class="rules__item">
        <span class="rules__tile"><ShapePiece :kind="4" special="line-h" /></span>
        <span>{{ t('shapes.rules.rocket') }}</span>
      </li>
      <li class="rules__item">
        <span class="rules__tile"><ShapePiece :kind="3" special="burst" /></span>
        <span>{{ t('shapes.rules.bomb') }}</span>
      </li>
      <li class="rules__item">
        <span class="rules__tile"><ShapePiece :kind="-1" special="prism" /></span>
        <span>{{ t('shapes.rules.prism') }}</span>
      </li>
    </ul>

    <h3 class="rules__heading">{{ t('shapes.rules.obstaclesTitle') }}</h3>
    <ul class="rules__grid">
      <li class="rules__item">
        <span class="rules__tile rules__tile--stack">
          <ObstacleArt type="target" />
          <ShapePiece :kind="1" special="none" />
        </span>
        <span>{{ t('shapes.rules.target') }}</span>
      </li>
      <li class="rules__item">
        <span class="rules__tile rules__tile--stack">
          <ShapePiece :kind="2" special="none" />
          <ObstacleArt type="chain" />
        </span>
        <span>{{ t('shapes.rules.chain') }}</span>
      </li>
      <li class="rules__item">
        <span class="rules__tile"><ObstacleArt type="crate" /></span>
        <span>{{ t('shapes.rules.crate') }}</span>
      </li>
      <li class="rules__item">
        <span class="rules__tile"><ShapePiece :kind="ITEM_KIND" special="none" /></span>
        <span>{{ t('shapes.rules.item') }}</span>
      </li>
    </ul>
    <p class="rules__text muted">{{ t('shapes.lobby.howToLevels') }}</p>
  </div>
</template>

<style scoped>
.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* A tiny example: swap the wiggling lemon away and three strawberries line up. */
.rules__demo {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: var(--space-2);
  border-radius: 14px;
  background: repeating-conic-gradient(#fffaf0 0 25%, #eef6dc 0 50%) 0 0 / 88px 88px;
  box-shadow: inset 0 2px 6px rgb(60 30 0 / 18%);
}

:root[data-theme='dark'] .rules__demo {
  background: repeating-conic-gradient(#343a54 0 25%, #282e46 0 50%) 0 0 / 88px 88px;
}

.rules__fruit {
  width: 40px;
  height: 40px;
}

.rules__fruit--swap {
  animation: demo-swap 2.4s ease-in-out infinite;
}

@keyframes demo-swap {
  0%,
  60%,
  100% {
    transform: none;
  }
  70% {
    transform: translateY(-12%) rotate(-10deg);
  }
  80% {
    transform: translateY(-12%) rotate(10deg);
  }
  90% {
    transform: none;
  }
}

.rules__text {
  font-size: var(--text-sm);
}

.rules__heading {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.rules__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rules__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-2);
  border-radius: 12px;
  background: color-mix(in srgb, var(--game-shapes) 7%, var(--color-surface-2));
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1.3;
}

.rules__tile {
  position: relative;
  flex: none;
  width: 38px;
  height: 38px;
}

.rules__tile--stack > :deep(svg) {
  position: absolute;
  inset: 0;
}

.rules__tile--stack > :deep(.shape-piece) {
  inset: 12%;
  width: 76%;
  height: 76%;
}

:root[data-motion='reduced'] .rules__fruit--swap {
  animation: none;
}
</style>
