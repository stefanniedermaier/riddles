<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { settingsPanelOf } from '@/games/settingsPanels'
import type { GameId } from '@/games/types'
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'

/**
 * App bar button that opens the settings of one game in a dialog, so options can be
 * changed without leaving the game. Renders nothing for games without settings.
 */
const props = defineProps<{ game: GameId }>()
const emit = defineEmits<{ open: []; close: [] }>()

const panel = computed(() => settingsPanelOf(props.game))
const open = ref(false)
const title = computed(() => t('common.gameSettings', { game: t(`${props.game}.name`) }))

function show(): void {
  open.value = true
  emit('open')
}

function hide(): void {
  open.value = false
  emit('close')
}
</script>

<template>
  <template v-if="panel">
    <button type="button" class="icon-btn" :aria-label="title" :title="title" @click="show">
      <AppIcon name="settings" />
    </button>
    <AppDialog :open="open" :title="title" @close="hide">
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
