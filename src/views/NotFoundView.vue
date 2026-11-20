<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import { t } from '@/core/i18n'
</script>

<template>
  <AppBar :title="t('notFound.title')" back-to="/" />
  <main class="page not-found">
    <p class="muted">{{ t('notFound.text') }}</p>
    <RouterLink to="/" custom>
      <template #default="{ navigate }">
        <AppButton variant="primary" icon="home" @click="navigate">{{ t('common.home') }}</AppButton>
      </template>
    </RouterLink>
  </main>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}
</style>
