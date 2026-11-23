<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import GameArt from '@/components/GameArt.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameOrderList from '@/components/GameOrderList.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { formatDate } from '@/core/format'
import { t } from '@/core/i18n'
import { settings, type LocaleSetting, type MotionSetting, type ThemeSetting } from '@/core/settings'
import { clearAll, exportData, importData, parseExport, type ExportFile } from '@/core/storage'
import { showToast } from '@/core/toast'
import { applyUpdate, checkForUpdate, updateAvailable } from '@/core/update'
import { repoUrl } from '@/core/legal'
import { visibleGames } from '@/games/layout'
import { settingsPanelOf } from '@/games/settingsPanels'
import type { GameId } from '@/games/types'

const version = __APP_VERSION__
/** Licence notices of the bundled third-party packages (generated at build time). */
const licensesUrl = `${import.meta.env.BASE_URL}licenses.txt`

// --- Updates: check now and install right away ------------------------------

const checkingUpdate = ref(false)

async function updateApp(): Promise<void> {
  if (checkingUpdate.value) return
  checkingUpdate.value = true
  const result = await checkForUpdate()
  checkingUpdate.value = false
  if (result === 'available') {
    showToast(t('pwa.updating'))
    applyUpdate()
  } else if (result === 'current') showToast(t('pwa.upToDate'))
  else if (result === 'offline') showToast(t('pwa.offline'))
  else showToast(t('pwa.checkFailed'))
}

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

// --- Game settings: pick a game, then change its options -------------------

const route = useRoute()

/** Shown games that have options, in the player's order. */
const configurableGames = computed(() =>
  visibleGames.value
    .map((game) => ({ id: game.id as GameId, panel: settingsPanelOf(game.id) }))
    .filter((game) => game.panel !== null),
)

const selectedGame = ref<GameId | null>(null)
const selectedPanel = computed(
  () => configurableGames.value.find((game) => game.id === selectedGame.value)?.panel ?? null,
)

// Preselect the game from `?game=<id>` (deep link), otherwise the first one.
watch(
  [configurableGames, () => route.query.game],
  ([list, requested]) => {
    const ids = list.map((game) => game.id)
    if (typeof requested === 'string' && ids.includes(requested as GameId)) {
      selectedGame.value = requested as GameId
    } else if (!selectedGame.value || !ids.includes(selectedGame.value)) {
      selectedGame.value = ids[0] ?? null
    }
  },
  { immediate: true },
)

// Keep the chosen game visible in the horizontally scrolling picker (without scrolling the
// page itself, so `scrollIntoView` is not used).
async function revealSelectedGame(): Promise<void> {
  await nextTick()
  const tab = document.getElementById(`game-tab-${selectedGame.value}`)
  const picker = tab?.parentElement
  if (!tab || !picker) return
  picker.scrollLeft = tab.offsetLeft - picker.offsetLeft - (picker.clientWidth - tab.offsetWidth) / 2
}

watch(selectedGame, revealSelectedGame)
onMounted(revealSelectedGame)

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

    <template v-if="configurableGames.length">
      <h2 class="section-title">{{ t('settings.gameSettings') }}</h2>
      <section class="card">
        <p class="muted info game-settings__hint">{{ t('settings.gameSettingsHint') }}</p>
        <div class="game-picker" role="tablist" :aria-label="t('settings.gameSettings')">
          <button
            v-for="game in configurableGames"
            :id="`game-tab-${game.id}`"
            :key="game.id"
            type="button"
            role="tab"
            class="game-picker__item"
            :class="{ 'game-picker__item--active': selectedGame === game.id }"
            :aria-selected="selectedGame === game.id"
            aria-controls="game-settings-panel"
            @click="selectedGame = game.id"
          >
            <GameArt :game="game.id" class="game-picker__art" />
            <span>{{ t(`${game.id}.name`) }}</span>
          </button>
        </div>
        <div
          id="game-settings-panel"
          role="tabpanel"
          class="game-settings__panel"
          :aria-labelledby="selectedGame ? `game-tab-${selectedGame}` : undefined"
        >
          <component :is="selectedPanel" v-if="selectedPanel" :key="selectedGame ?? ''" />
        </div>
      </section>
    </template>

    <h2 class="section-title">{{ t('settings.data') }}</h2>
    <section class="card group">
      <p class="muted info">{{ t('settings.dataInfo') }}</p>
      <RouterLink to="/privacy" class="about__link">
        <AppIcon name="lock" :size="16" />
        {{ t('privacy.link') }}
      </RouterLink>
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
        :aria-label="t('settings.import')"
        @change="onFileChosen"
      />
    </section>

    <h2 class="section-title">{{ t('settings.about') }}</h2>
    <section class="card group about">
      <p>
        <strong>{{ t('app.name') }}</strong>
        <span class="muted"> · {{ t('settings.version', { version }) }}</span>
      </p>
      <AppButton
        icon="restart"
        :variant="updateAvailable ? 'primary' : 'secondary'"
        block
        :disabled="checkingUpdate"
        @click="updateApp"
      >
        {{
          checkingUpdate ? t('pwa.checking') : updateAvailable ? t('pwa.updateNow') : t('pwa.check')
        }}
      </AppButton>
      <p class="muted">{{ t('settings.license') }}</p>
      <a :href="repoUrl" target="_blank" rel="noopener" class="about__link">
        {{ t('settings.source') }}
        <AppIcon name="external" :size="16" />
      </a>
      <a :href="licensesUrl" target="_blank" rel="noopener" class="about__link">
        {{ t('settings.thirdParty') }}
      </a>
      <RouterLink to="/imprint" class="about__link">{{ t('imprint.link') }}</RouterLink>
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

.game-settings__hint {
  padding: var(--space-3) var(--space-4) 0;
}

.game-picker {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding: var(--space-3) var(--space-4);
  scrollbar-width: none;
}

.game-picker__item {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 68px;
  padding: var(--space-2) var(--space-1);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
}

.game-picker__item--active {
  border-color: var(--color-accent);
  background: var(--color-surface);
  color: var(--color-text);
}

.game-picker__art {
  width: 40px;
  height: 40px;
}

.game-settings__panel {
  border-top: 1px solid var(--color-border);
}

.about__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: 600;
  text-decoration: none;
}
</style>
