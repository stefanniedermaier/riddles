<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import ProviderAddress from '@/components/ProviderAddress.vue'
import { t } from '@/core/i18n'
import { repoUrl } from '@/core/legal'
</script>

<template>
  <AppBar :title="t('imprint.title')" back-to="/settings" />

  <main class="page imprint">
    <section class="block">
      <h2 class="section-title">{{ t('imprint.providerTitle') }}</h2>
      <ProviderAddress />
      <p>{{ t('imprint.provider') }}</p>
    </section>

    <section class="block">
      <h2 class="section-title">{{ t('imprint.contactTitle') }}</h2>
      <p>{{ t('imprint.contact') }}</p>
      <a :href="repoUrl" target="_blank" rel="noopener" class="link">
        {{ t('privacy.projectPage') }} <AppIcon name="external" :size="16" />
      </a>
      <br />
      <RouterLink to="/privacy" class="link">{{ t('privacy.link') }}</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.block p {
  line-height: 1.55;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  font-weight: 600;
  text-decoration: none;
}
</style>
