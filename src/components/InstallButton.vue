<script setup lang="ts">
import { ref } from 'vue'

import { t } from '@/core/i18n'
import { installMode, promptInstall } from '@/core/install'
import { showToast } from '@/core/toast'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'

/** Install call-to-action for the home screen; renders nothing once the app is installed. */
const showIosHelp = ref(false)

async function install(): Promise<void> {
  if (installMode.value === 'ios') {
    showIosHelp.value = true
    return
  }
  if (await promptInstall()) showToast(t('install.done'))
}
</script>

<template>
  <div v-if="installMode" class="install">
    <AppIcon name="download" :size="22" class="install__icon" />
    <p class="install__hint">{{ t('install.hint') }}</p>
    <AppButton variant="primary" class="install__button" @click="install">
      {{ t('install.button') }}
    </AppButton>
  </div>

  <AppDialog :open="showIosHelp" :title="t('install.iosTitle')" @close="showIosHelp = false">
    <ol class="steps">
      <li>
        <AppIcon name="share" :size="22" class="steps__icon" />
        <span>{{ t('install.iosStep1') }}</span>
      </li>
      <li>
        <AppIcon name="addSquare" :size="22" class="steps__icon" />
        <span>{{ t('install.iosStep2') }}</span>
      </li>
      <li>
        <AppIcon name="check" :size="22" class="steps__icon" />
        <span>{{ t('install.iosStep3') }}</span>
      </li>
    </ol>
    <p class="note">{{ t('install.iosNote') }}</p>
    <template #actions>
      <AppButton variant="primary" block @click="showIosHelp = false">{{ t('common.ok') }}</AppButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.install {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  border-radius: 0;
  background: var(--color-accent-soft);
}

.install__icon {
  color: var(--color-accent);
}

.install__hint {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.install__button {
  flex: none;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.steps__icon {
  flex: none;
  padding: 6px;
  width: 36px;
  height: 36px;
  border-radius: 0;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.note {
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
