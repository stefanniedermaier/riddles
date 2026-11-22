<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { settingsPanelOf } from '@/games/settingsPanels'
import type { GameId } from '@/games/types'
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'

/**
 * App bar button for the game lobby that opens the settings of one game in a dialog.
 * Renders nothing for games without settings. Not shown while a game is running.
 */
const props = defineProps<{ game: GameId }>()

const panel = computed(() => settingsPanelOf(props.game))
const open = ref(false)
const title = computed(() => t('common.gameSettings', { game: t(`${props.game}.name`) }))
</script>

<template>
  <template v-if="panel">
    <button type="button" class="icon-btn" :aria-label="title" :title="title" @click="open = true">
      <AppIcon name="settings" />
    </button>
    <AppDialog :open="open" :title="title" @close="open = false">
      <div class="game-settings">
        <component :is="panel" />
      </div>
    </AppDialog>
  </template>
</template>

<style scoped>
.game-settings {
  margin: 0 calc(-1 * var(--space-4));
}
</style>
