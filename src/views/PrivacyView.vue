<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { t, type MessageKey } from '@/core/i18n'

const repoUrl = 'https://github.com/stefanniedermaier/riddles'

/** Controller within the meaning of the GDPR (Art. 13(1)(a)). */
const controller = {
  name: 'Stefan Niedermaier',
  street: 'Ostendstr. 5',
  city: '85777 Fahrenzhausen',
  email: 'stefan@niedermaier.bayern',
}
const githubPrivacyUrl =
  'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement'

const sections: { title: MessageKey; text: MessageKey }[] = [
  { title: 'privacy.storedTitle', text: 'privacy.stored' },
  { title: 'privacy.hostingTitle', text: 'privacy.hosting' },
  { title: 'privacy.shareTitle', text: 'privacy.share' },
  { title: 'privacy.controlTitle', text: 'privacy.control' },
  { title: 'privacy.rightsTitle', text: 'privacy.rights' },
]
</script>

<template>
  <AppBar :title="t('privacy.title')" back-to="/settings" />

  <main class="page privacy">
    <section class="card summary">
      <AppIcon name="lock" :size="28" class="summary__icon" />
      <div>
        <h2>{{ t('privacy.summaryTitle') }}</h2>
        <p>{{ t('privacy.summary') }}</p>
      </div>
    </section>

    <section v-for="section in sections" :key="section.title" class="block">
      <h2 class="section-title">{{ t(section.title) }}</h2>
      <p>{{ t(section.text) }}</p>
      <a
        v-if="section.title === 'privacy.hostingTitle'"
        :href="githubPrivacyUrl"
        target="_blank"
        rel="noopener"
        class="link"
      >
        {{ t('privacy.githubPrivacy') }} <AppIcon name="external" :size="16" />
      </a>
    </section>

    <section class="block">
      <h2 class="section-title">{{ t('privacy.contactTitle') }}</h2>
      <p>{{ t('privacy.contact') }}</p>
      <address class="controller">
        {{ controller.name }}<br />
        {{ controller.street }}<br />
        {{ controller.city }}<br />
        {{ t('privacy.country') }}
      </address>
      <p>{{ t('privacy.contactMail') }}</p>
      <a :href="`mailto:${controller.email}`" class="link">
        <AppIcon name="mail" :size="16" /> {{ controller.email }}
      </a>
      <br />
      <a :href="repoUrl" target="_blank" rel="noopener" class="link">
        {{ t('privacy.projectPage') }} <AppIcon name="external" :size="16" />
      </a>
    </section>
  </main>
</template>

<style scoped>
.summary {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-left: 4px solid var(--color-success);
}

.summary__icon {
  color: var(--color-success);
}

.summary h2 {
  font-size: var(--text-md);
  font-weight: 800;
}

.summary p {
  margin-top: var(--space-1);
}

.block p {
  line-height: 1.55;
}

.controller {
  margin: var(--space-2) 0;
  font-style: normal;
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
