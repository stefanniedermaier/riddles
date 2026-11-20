<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameOrderList from '@/components/GameOrderList.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { formatDate } from '@/core/format'
import { t } from '@/core/i18n'
import { settings, type LocaleSetting, type MotionSetting, type ThemeSetting } from '@/core/settings'
import { clearAll, exportData, importData, parseExport, type ExportFile } from '@/core/storage'
import { showToast } from '@/core/toast'
import { visibleGames } from '@/games/layout'
import { games } from '@/games/registry'
import type { GameId } from '@/games/types'

const version = __APP_VERSION__
const repoUrl = 'https://github.com/stefanniedermaier/riddles'

const localeOptions = computed(() => [
  { value: 'system' as LocaleSetting, label: t('settings.languageSystem') },
  { value: 'en' as LocaleSetting, label: 'English' },
  { value: 'de' as LocaleSetting, label: 'Deutsch' },
])
const themeOptions = computed(() => [
  { value: 'system' as ThemeSetting, label: t('settings.themeSystem') },
  { value: 'light' as ThemeSetting, label: t('settings.themeLight') },
  { value: 'dark' as ThemeSetting, label: t('settings.themeDark') },
])
const motionOptions = computed(() => [
  { value: 'system' as MotionSetting, label: t('settings.motionSystem') },
  { value: 'full' as MotionSetting, label: t('settings.motionFull') },
  { value: 'reduced' as MotionSetting, label: t('settings.motionReduced') },
])

// One async component per game (created once), shown in the user's order for enabled games.
const settingsComponents = new Map(
  games
    .filter((game) => game.settingsComponent)
    .map((game) => [game.id, defineAsyncComponent(game.settingsComponent!)] as const),
)
const gameSettings = computed(() =>
  visibleGames.value
    .filter((game) => settingsComponents.has(game.id))
    .map((game) => ({ id: game.id as GameId, component: settingsComponents.get(game.id)! })),
)

// --- Export ---------------------------------------------------------------

async function exportBackup(): Promise<void> {
  const file = exportData(version)
  const name = `riddles-backup-${file.exportedAt.slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })

  // On phones the share sheet is the most reliable way to save a file (especially iOS).
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches
  const shareFile = new File([blob], name, { type: 'application/json' })
  if (isTouch && navigator.canShare?.({ files: [shareFile] })) {
    try {
      await navigator.share({ files: [shareFile], title: name })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// --- Import ---------------------------------------------------------------

const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<ExportFile | null>(null)

async function onFileChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    pendingImport.value = parseExport(await file.text())
  } catch {
    showToast(t('settings.importFailed'))
  }
}

function confirmImport(): void {
  if (!pendingImport.value) return
  importData(pendingImport.value)
  window.location.reload()
}

// --- Reset ----------------------------------------------------------------

const confirmReset = ref(false)

function resetAll(): void {
  clearAll()
  window.location.reload()
}
</script>

<template>
  <AppBar :title="t('settings.title')" back-to="/" />

  <main class="page">
    <h2 class="section-title">{{ t('settings.general') }}</h2>
    <section class="card group">
      <div class="field">
        <span class="field__label">{{ t('settings.language') }}</span>
        <SegmentedControl
          v-model="settings.locale"
          :options="localeOptions"
          :label="t('settings.language')"
        />
      </div>
      <div class="field">
        <span class="field__label">{{ t('settings.theme') }}</span>
        <SegmentedControl v-model="settings.theme" :options="themeOptions" :label="t('settings.theme')" />
      </div>
      <div class="field">
        <span class="field__label">{{ t('settings.motion') }}</span>
        <SegmentedControl
          v-model="settings.motion"
          :options="motionOptions"
          :label="t('settings.motion')"
        />
      </div>
    </section>

    <h2 class="section-title">{{ t('settings.games') }}</h2>
    <section class="card">
      <GameOrderList />
    </section>

    <template v-for="game in gameSettings" :key="game.id">
      <h2 class="section-title">{{ t(`${game.id}.name`) }}</h2>
      <section class="card">
        <component :is="game.component" />
      </section>
    </template>

    <h2 class="section-title">{{ t('settings.data') }}</h2>
    <section class="card group">
      <p class="muted info">{{ t('settings.dataInfo') }}</p>
      <AppButton icon="download" block @click="exportBackup">{{ t('settings.export') }}</AppButton>
      <AppButton icon="upload" block @click="fileInput?.click()">{{ t('settings.import') }}</AppButton>
      <AppButton icon="trash" variant="danger" block @click="confirmReset = true">
        {{ t('settings.reset') }}
      </AppButton>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="visually-hidden"
        tabindex="-1"
        @change="onFileChosen"
      />
    </section>

    <h2 class="section-title">{{ t('settings.about') }}</h2>
    <section class="card group about">
      <p>
        <strong>{{ t('app.name') }}</strong>
        <span class="muted"> · {{ t('settings.version', { version }) }}</span>
      </p>
      <p class="muted">{{ t('settings.license') }}</p>
      <a :href="repoUrl" target="_blank" rel="noopener" class="about__link">
        {{ t('settings.source') }}
        <AppIcon name="external" :size="16" />
      </a>
    </section>
  </main>

  <ConfirmDialog
    :open="pendingImport !== null"
    :title="t('settings.import')"
    :message="
      t('settings.importConfirm', { date: pendingImport ? formatDate(pendingImport.exportedAt) : '' })
    "
    :confirm-label="t('settings.import')"
    danger
    @confirm="confirmImport"
    @cancel="pendingImport = null"
  />
  <ConfirmDialog
    :open="confirmReset"
    :title="t('settings.reset')"
    :message="t('settings.resetConfirm')"
    :confirm-label="t('settings.reset')"
    danger
    @confirm="resetAll"
    @cancel="confirmReset = false"
  />
</template>

<style scoped>
.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-weight: 600;
}

.info {
  font-size: var(--text-sm);
}

.about {
  gap: var(--space-2);
}

.about__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: 600;
  text-decoration: none;
}
</style>
