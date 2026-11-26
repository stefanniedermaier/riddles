<script setup lang="ts">
import { useRouter, type RouteLocationRaw } from 'vue-router'

import { t } from '@/core/i18n'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  title?: string
  /** Where "back" leads when there is no in-app history entry (e.g. after a reload). */
  backTo?: RouteLocationRaw
}>()

const router = useRouter()

function goBack(): void {
  // Vue Router stores the previous location in history.state.back.
  const hasHistory = typeof window !== 'undefined' && window.history.state?.back != null
  if (hasHistory) router.back()
  else void router.replace(props.backTo ?? '/')
}
</script>

<template>
  <header class="app-bar">
    <div class="app-bar__inner">
      <button
        v-if="backTo !== undefined"
        type="button"
        class="app-bar__icon-btn"
        :aria-label="t('common.back')"
        @click="goBack"
      >
        <AppIcon name="back" />
      </button>
      <div class="app-bar__title">
        <slot name="title">
          <h1>{{ title }}</h1>
        </slot>
      </div>
      <div class="app-bar__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-appbar);
  padding-top: env(safe-area-inset-top);
  /* Fully opaque: nothing scrolling underneath shows through (and no backdrop blur, which
    costs a repaint of everything under a sticky bar on every frame on low-end phones). */
  background: var(--color-bg);
}

.app-bar__inner {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  max-width: var(--content-max);
  height: var(--appbar-height);
  margin: 0 auto;
  padding: 0 max(var(--space-2), env(safe-area-inset-right)) 0
    max(var(--space-2), env(safe-area-inset-left));
}

.app-bar__title {
  flex: 1;
  min-width: 0;
  padding: 0 var(--space-2);
}

.app-bar__title :deep(h1) {
  overflow: hidden;
  font-size: var(--text-lg);
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.app-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.app-bar__icon-btn,
.app-bar__actions :deep(.icon-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
}

</style>
