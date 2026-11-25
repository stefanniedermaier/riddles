<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'

/**
 * App bar of a play view: title, back link, the running time and a rules button that opens
 * the rules (default slot) in a dialog. Extra buttons go into the `actions` slot.
 */
defineProps<{
  title: string
  backTo: string
  /** Shown time; hidden while a puzzle is being generated. */
  elapsedMs: number | null
  rulesLabel: string
  rulesTitle: string
}>()

const rulesOpen = defineModel<boolean>('rulesOpen', { default: false })
</script>

<template>
  <AppBar :title="title" :back-to="backTo">
    <template #actions>
      <slot name="actions" />
      <span v-if="elapsedMs !== null" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(elapsedMs) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="rulesLabel" @click="rulesOpen = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <AppDialog :open="rulesOpen" :title="rulesTitle" @close="rulesOpen = false">
    <slot />
  </AppDialog>
</template>

<style scoped>
.timer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  font-weight: 600;
  color: var(--color-text-muted);
}
</style>
