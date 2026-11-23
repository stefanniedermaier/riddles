<script setup lang="ts">
import { watch } from 'vue'

import { t } from '@/core/i18n'
import { showToast } from '@/core/toast'
import { applyUpdate, initUpdates, offlineReady, updateAvailable } from '@/core/update'
import AppButton from './AppButton.vue'

initUpdates()

watch(offlineReady, (ready) => {
  if (ready) showToast(t('pwa.offlineReady'))
})
</script>

<template>
  <Transition name="banner">
    <div v-if="updateAvailable" class="update-banner" role="status">
      <span>{{ t('pwa.updateAvailable') }}</span>
      <AppButton variant="primary" @click="applyUpdate">{{ t('pwa.reload') }}</AppButton>
    </div>
  </Transition>
</template>

<style scoped>
.update-banner {
  position: fixed;
  left: 50%;
  bottom: max(var(--space-4), env(safe-area-inset-bottom));
  z-index: 150;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: min(calc(100% - 2 * var(--space-4)), 440px);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  transform: translateX(-50%);
}

.update-banner span {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
}

.banner-enter-active,
.banner-leave-active {
  transition: opacity var(--dur-med);
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
}
</style>
