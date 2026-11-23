<script setup lang="ts">
import { t } from '@/core/i18n'

/** How to play Merge (lobby expander and in-game rules dialog). */
</script>

<template>
  <p class="rules-text">{{ t('merge.lobby.howTo') }}</p>
</template>

<style scoped>
.rules-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
