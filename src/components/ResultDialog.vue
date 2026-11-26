<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { gameName, t } from '@/core/i18n'
import { appUrl, challengeUrl, isApplePlatform, shareLink, type ResultShare } from '@/core/share'
import { renderResultCard, svgToImage } from '@/core/shareImage'
import { showToast } from '@/core/toast'
import type { GameDescriptor } from '@/games/types'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'
import CelebrationBurst from './CelebrationBurst.vue'
import GameArt from './GameArt.vue'
import type { IconName } from './icons'

/**
 * Generic "solved / game over" dialog. Pass the result rows and put buttons into the
 * `actions` slot.
 *
 * A win is celebrated: confetti, a golden icon on rotating rays, stars that pop in one by
 * one and rows that slide in. By default every dialog with the trophy icon celebrates;
 * pass `celebrate` to decide explicitly (e.g. a "game over" only with a new best).
 *
 * With `share`, a "Share result" button – also on a "game over" without celebration (score
 * games like Blocks or Merge simply end with a score worth sharing) – sends a challenge link (game lobby + difficulty +
 * result) to the share sheet, or copies it. An image of the result (trophy, game logo,
 * difficulty, result, "personal best" badge) is prepared when the dialog opens and shared
 * along where the device can share files; it is not shown in the dialog (no scrolling).
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    rows: { label: string; value: string; highlight?: boolean }[]
    /** Shown as a badge, e.g. "New personal best!". */
    badge?: string
    /** 0–3 stars (Shapes levels); omitted when undefined. */
    stars?: number
    /** Header icon, e.g. something else than the trophy for a lost round. */
    icon?: IconName
    /** Celebrate with confetti and animations; defaults to `icon === 'trophy'`. */
    celebrate?: boolean
    /** Offer to share the result as a challenge link. */
    share?: ResultShare
  }>(),
  {
    subtitle: undefined,
    badge: undefined,
    stars: undefined,
    icon: 'trophy',
    celebrate: undefined,
    share: undefined,
  },
)

const emit = defineEmits<{ close: [] }>()

const festive = computed(() => props.celebrate ?? props.icon === 'trophy')

const shareIcon = isApplePlatform() ? 'share' : 'shareNodes'

/**
 * The game descriptor (for the variant label), loaded when the dialog opens: the registry
 * imports the game modules, which import this dialog (a static import would be circular),
 * and the share sheet must open straight from the click (no await before it, for Safari).
 */
const descriptor = shallowRef<GameDescriptor | null>(null)
watch(
  () => (props.open ? props.share?.game : undefined),
  async (id) => {
    if (!id || descriptor.value?.id === id) return
    const { games } = await import('@/games/registry')
    descriptor.value = games.find((candidate) => candidate?.id === id) ?? null
  },
  { immediate: true },
)

/** Name, difficulty and result of the shared game (texts for the message and the image). */
const shareInfo = computed(() => {
  const share = props.share
  if (!share) return null
  const game = descriptor.value?.id === share.game ? descriptor.value : null
  const params = {
    game: gameName(share.game),
    variant: game?.variantLabel(share.variant) ?? share.variant,
    result: share.result ?? '',
  }
  const text = !share.result
    ? t('share.resultPlain', params)
    : share.kind === 'score'
      ? t('share.resultScore', params)
      : t('share.resultTime', params)
  return { ...params, text, url: challengeUrl(share), ready: game !== null }
})

// --- The result image ---------------------------------------------------------------

const artSource = ref<HTMLElement | null>(null)
const imageFile = shallowRef<File | null>(null)

function dropImage(): void {
  imageFile.value = null
}

async function prepareImage(): Promise<void> {
  const share = props.share
  const info = shareInfo.value
  if (!share || !info) return
  await nextTick()
  const svg = artSource.value?.querySelector('svg')
  const logo = svg ? await svgToImage(svg) : null
  // The image always uses the light look (logo and game colour), whatever the app theme:
  // the logo source sits in a `.theme-light` element, which also gives the light colour.
  const light = artSource.value ? getComputedStyle(artSource.value) : getComputedStyle(document.documentElement)
  const address = appUrl().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const blob = await renderResultCard({
    title: props.title,
    game: info.game,
    variant: info.variant,
    result: share.result,
    resultLabel: share.result ? t(share.kind === 'score' ? 'common.score' : 'common.time') : undefined,
    badge: share.newBest ? t('common.newBest') : undefined,
    accent: light.getPropertyValue(`--game-${share.game}`).trim() || '#5b4bdb',
    logo,
    footer: `${t('app.name')} · ${address}`,
    fontFamily: getComputedStyle(document.body).fontFamily,
  })
  // The dialog may have closed (or the game changed) while drawing.
  if (!blob || !props.open || props.share?.game !== share.game) return
  dropImage()
  // Not shown in the dialog (it would make it scroll on phones) – it goes along when sharing.
  imageFile.value = new File([blob], `riddles-${share.game}.png`, { type: 'image/png' })
}

watch(
  () => (props.open && shareInfo.value?.ready ? shareInfo.value.text : null),
  (key) => {
    // The image is a bonus: if drawing fails, sharing still works with text and link.
    if (key) prepareImage().catch(() => dropImage())
    else dropImage()
  },
)

onBeforeUnmount(dropImage)

async function shareResult(): Promise<void> {
  const info = shareInfo.value
  if (!info) return
  // With an image where the device can share files (most phones); the link goes into the
  // text, as some apps drop the separate URL when a file is attached.
  const file = imageFile.value
  if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: info.game, text: `${info.text} ${info.url}` })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      // fall back to sharing the link
    }
  }
  const outcome = await shareLink(info.url, info.game, info.text)
  if (outcome === 'copied') showToast(t('share.copied'))
  else if (outcome === 'failed') showToast(t('share.failed', { url: info.url }), 6000)
}
</script>

<template>
  <AppDialog :open="open" :label="title" :dismissible="false" @close="emit('close')">
    <div class="result" :class="festive ? 'result--festive' : 'result--gloomy'">
      <div class="result__icon-wrap" aria-hidden="true">
        <span v-if="festive" class="result__rays" />
        <svg v-else class="result__cloud" viewBox="0 0 80 46">
          <g class="result__drops">
            <path d="M24 30l-3 8M38 32l-3 8M52 30l-3 8M31 38l-2 6M45 38l-2 6" />
          </g>
          <path
            d="M18 30Q6 30 7 21Q8 13 18 14Q20 4 33 5Q43 0 50 9Q60 5 65 14Q75 14 74 22Q73 30 62 30Z"
            class="result__cloud-body"
          />
        </svg>
        <div class="result__icon">
          <AppIcon :name="icon" :size="festive ? 34 : 32" />
        </div>
      </div>
      <h2 class="result__title">{{ title }}</h2>
      <p v-if="subtitle" class="result__subtitle">{{ subtitle }}</p>
      <div v-if="stars !== undefined" class="result__stars" :aria-label="`${stars} / 3`">
        <AppIcon
          v-for="i in 3"
          :key="i"
          :name="i <= stars ? 'starFilled' : 'star'"
          :size="i === 2 ? 40 : 32"
          class="result__star"
          :class="{ 'result__star--on': i <= stars }"
          :style="{ '--i': i }"
        />
      </div>
      <p v-if="badge" class="result__badge">{{ badge }}</p>
      <dl class="result__rows">
        <div v-for="(row, i) in rows" :key="row.label" class="result__row" :style="{ '--i': i }">
          <dt>{{ row.label }}</dt>
          <dd class="tabular" :class="{ 'result__value--highlight': row.highlight }">
            {{ row.value }}
          </dd>
        </div>
      </dl>
      <template v-if="share">
        <!-- Source of the game logo for the image (drawn from the rendered SVG). -->
        <div ref="artSource" class="result__art-source theme-light" aria-hidden="true">
          <GameArt :game="share.game" />
        </div>
      </template>
    </div>
    <template #actions>
      <!-- Main action across the full width, the others side by side: no scrolling on phones. -->
      <div class="result__actions">
        <slot name="actions" />
        <AppButton v-if="share" class="result__share" :icon="shareIcon" block @click="shareResult">
          {{ t('share.result') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
  <CelebrationBurst :active="open" :mood="festive ? 'win' : 'lose'" />
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.result__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.result__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.result__title {
  font-size: var(--text-2xl);
  font-weight: 800;
}

.result__subtitle {
  margin-top: var(--space-1);
  color: var(--color-text-muted);
}

.result__stars {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
  color: var(--color-surface-3);
}

.result__star--on {
  color: var(--game-crowns);
}

.result__badge {
  margin-top: var(--space-3);
  padding: var(--space-1) var(--space-3);
  border-radius: 0;
  background: var(--color-success-soft);
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: 700;
}

/* Two columns of label-over-value pairs: half the height of a one-column table. */
.result__rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: var(--space-4);
  width: 100%;
  margin: var(--space-3) 0 0;
  text-align: left;
}

.result__row {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

.result__row dt {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.result__row dd {
  overflow: hidden;
  margin: 0;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

/* The first action (play again, next level …) spans the row; a last one left alone too. */
.result__actions > :deep(:first-child),
.result__actions > :deep(:last-child:nth-child(even)) {
  grid-column: 1 / -1;
}

.result__value--highlight {
  color: var(--color-success);
}

.result__art-source {
  position: absolute;
  left: -9999px;
  width: 64px;
  height: 64px;
  overflow: hidden;
}

/* --- Celebration ------------------------------------------------------------------ */

.result--festive .result__icon {
  width: 64px;
  height: 64px;
  border: 3px solid #fff;
  background: radial-gradient(circle at 35% 30%, var(--gold-light), var(--gold) 55%, #e08a00);
  box-shadow:
    0 0 0 3px var(--gold-deep),
    inset 0 -4px 0 rgb(150 70 0 / 25%),
    var(--elevation-2);
  color: #fff;
  filter: drop-shadow(0 0 1px rgb(120 60 0 / 60%));
  animation: icon-pop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) 0.1s both;
}

/* Soft golden rays turning behind the icon. */
.result__rays {
  position: absolute;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: repeating-conic-gradient(rgb(255 200 40 / 38%) 0 10deg, transparent 10deg 24deg);
  -webkit-mask: radial-gradient(circle, #000 25%, transparent 68%);
  mask: radial-gradient(circle, #000 25%, transparent 68%);
  animation:
    rays-in 0.6s var(--ease-out) both,
    rays-spin 14s linear infinite;
}

.result--festive .result__title {
  animation: title-pop 0.5s cubic-bezier(0.3, 1.5, 0.5, 1) 0.25s both;
}

.result--festive .result__star--on {
  color: var(--gold);
  filter: drop-shadow(0 2px 0 #c77800) drop-shadow(0 0 6px rgb(255 200 40 / 70%));
  animation: star-pop 0.5s cubic-bezier(0.3, 1.8, 0.5, 1) calc(0.45s + var(--i) * 0.2s) both;
}

.result--festive .result__badge {
  animation: title-pop 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) 1.05s both;
}

.result--festive .result__row {
  animation: row-in 0.4s var(--ease-out) calc(0.5s + var(--i) * 0.1s) both;
}

@keyframes icon-pop {
  from {
    transform: scale(0) rotate(-30deg);
  }
}

@keyframes rays-in {
  from {
    opacity: 0;
    scale: 0.3;
  }
}

@keyframes rays-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes title-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes star-pop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-90deg);
  }
  70% {
    opacity: 1;
  }
}

@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

/* --- Game over ----------------------------------------------------------------------- */

.result--gloomy .result__icon-wrap {
  margin-top: 36px;
}

.result--gloomy .result__icon {
  border: 3px solid #fff;
  background: radial-gradient(circle at 35% 30%, #c9d3e3, #7d8ca6 60%, #56627a);
  box-shadow:
    0 0 0 3px #5d6a82,
    inset 0 -4px 0 rgb(20 30 50 / 25%),
    var(--elevation-2);
  color: #fff;
  animation: icon-drop 0.75s cubic-bezier(0.3, 1.4, 0.5, 1) both;
}

/* A little rain cloud hovering over the icon. */
.result__cloud {
  position: absolute;
  bottom: 64px;
  left: 50%;
  width: 78px;
  margin-left: -39px;
  overflow: visible;
  animation: cloud-in 0.6s var(--ease-out) 0.35s both;
}

.result__cloud-body {
  fill: #9aa6bb;
  stroke: #6e7b93;
  stroke-width: 2;
}

:root[data-theme='dark'] .result__cloud-body {
  fill: #5d6880;
  stroke: #8692aa;
}

.result__drops {
  fill: none;
  stroke: #6fa4e8;
  stroke-width: 2.6;
  stroke-linecap: round;
  animation: drizzle 0.9s linear 0.9s infinite;
}

.result--gloomy .result__title {
  animation: title-sink 0.7s var(--ease-out) 0.2s both;
}

.result--gloomy .result__row {
  animation: row-in 0.4s var(--ease-out) calc(0.5s + var(--i) * 0.1s) both;
}

@keyframes icon-drop {
  0% {
    opacity: 0;
    transform: translateY(-70px) rotate(-12deg);
  }
  60% {
    opacity: 1;
    transform: translateY(4px) rotate(6deg);
  }
  80% {
    transform: translateY(-2px) rotate(-3deg);
  }
}

@keyframes cloud-in {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(0.7);
  }
}

@keyframes drizzle {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  30% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes title-sink {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  50% {
    opacity: 1;
    transform: translateX(-5px);
  }
  65% {
    transform: translateX(5px);
  }
  80% {
    transform: translateX(-2px);
  }
}

:root[data-motion='reduced'] .result--festive *,
:root[data-motion='reduced'] .result--gloomy *,
:root[data-motion='reduced'] .result__rays {
  animation: none !important;
}
</style>
