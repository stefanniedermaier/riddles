<script setup lang="ts">
import { useId } from 'vue'

import { t } from '@/core/i18n'
import BubbleArt from './BubbleArt.vue'
import BubbleDefs from './BubbleDefs.vue'
import { BOMB, RAINBOW, STONE } from './logic/types'

/** How to play Bubbles (lobby expander and in-game rules dialog), with a legend of the specials. */
const ids = `bubbles-rules-${useId()}`

const LEGEND = [
  { value: BOMB, marked: false, key: 'bomb' },
  { value: RAINBOW, marked: false, key: 'rainbow' },
  { value: STONE, marked: false, key: 'stone' },
  { value: 4, marked: true, key: 'marked' },
] as const
</script>

<template>
  <p class="rules-text">{{ t('bubbles.lobby.howTo') }}</p>
  <p class="rules-text">{{ t('bubbles.lobby.howToModes') }}</p>
  <p class="rules-text">{{ t('bubbles.lobby.howToSpecials') }}</p>
  <ul class="legend">
    <li v-for="item in LEGEND" :key="item.key">
      <svg viewBox="-0.75 -0.75 1.5 1.5" aria-hidden="true">
        <BubbleDefs :ids="ids" />
        <BubbleArt :value="item.value" :x="0" :y="0" :ids="ids" :marked="item.marked" />
      </svg>
      <span>{{ t(`bubbles.legend.${item.key}`) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.rules-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.rules-text + .rules-text {
  margin-top: var(--space-2);
}

.legend {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.legend li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

/* Each special on a small piece of the dark holo panel. */
.legend svg {
  flex: none;
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, #121a44, #070b24);
  border: 1px solid rgb(79 243 255 / 50%);
}
</style>
