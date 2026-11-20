<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { t } from '@/core/i18n'
import { levelProgress, loadRun } from './store'

const router = useRouter()

const COLUMNS = 4
const savedLevel = loadRun('levels')?.level?.n

/** Shows every unlocked level plus a few locked ones, in full rows of four. */
const levels = computed(() => {
  const unlocked = levelProgress.value.unlocked
  const count = Math.max(20, Math.ceil((unlocked + 8) / COLUMNS) * COLUMNS)
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return {
      n,
      locked: n > unlocked,
      stars: levelProgress.value.stars[String(n)] ?? 0,
      saved: n === savedLevel,
    }
  })
})

function play(level: number): void {
  if (level === savedLevel) {
    void router.push({ name: 'shapes-play', params: { mode: 'levels' } })
  } else {
    void router.push({
      name: 'shapes-play',
      params: { mode: 'levels' },
      query: { new: '1', level: String(level) },
    })
  }
}

function label(level: { n: number; locked: boolean; stars: number }): string {
  const name = t('shapes.levels.level', { level: level.n })
  if (level.locked) return `${name}, ${t('shapes.levels.locked')}`
  return `${name}, ${t('shapes.levels.stars', { stars: level.stars })}`
}
</script>

<template>
  <AppBar :title="t('shapes.levels.title')" :back-to="{ name: 'shapes' }" />
  <main class="page">
    <ol class="levels">
      <li v-for="level in levels" :key="level.n">
        <button
          type="button"
          class="level"
          :class="{ 'level--locked': level.locked, 'level--saved': level.saved }"
          :disabled="level.locked"
          :aria-label="label(level)"
          @click="play(level.n)"
        >
          <span class="level__number tabular">{{ level.n }}</span>
          <span v-if="level.locked" class="level__lock"><AppIcon name="lock" :size="16" /></span>
          <span v-else class="level__stars" aria-hidden="true">
            <AppIcon
              v-for="i in 3"
              :key="i"
              :name="i <= level.stars ? 'starFilled' : 'star'"
              :size="14"
              :class="{ 'level__star--on': i <= level.stars }"
            />
          </span>
          <span v-if="level.saved" class="level__badge">{{ t('shapes.levels.saved') }}</span>
        </button>
      </li>
    </ol>
  </main>
</template>

<style scoped>
.levels {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.level {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

.level:active:not(:disabled) {
  transform: scale(0.96);
}

.level--locked {
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  cursor: default;
}

.level--saved {
  border-color: var(--game-shapes);
  box-shadow: 0 0 0 1px var(--game-shapes);
}

.level__number {
  font-size: var(--text-xl);
  font-weight: 800;
}

.level__stars {
  display: flex;
  color: var(--color-surface-3);
}

.level__star--on {
  color: var(--game-crowns);
}

.level__badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--game-shapes);
  color: transparent;
  font-size: 0;
}
</style>
