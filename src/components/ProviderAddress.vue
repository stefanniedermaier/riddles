<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { t } from '@/core/i18n'
import { provider } from '@/core/legal'
</script>

<template>
  <address class="provider">
    {{ provider.name }}<br />
    {{ provider.street }}<br />
    {{ provider.city }}<br />
    {{ t('legal.country') }}
  </address>
  <a :href="`mailto:${provider.email}`" class="provider__mail">
    <AppIcon name="mail" :size="16" /> {{ provider.email }}
  </a>
</template>

<style scoped>
.provider {
  margin: var(--space-2) 0;
  font-style: normal;
  line-height: 1.55;
}

.provider__mail {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: 600;
  text-decoration: none;
}
</style>
