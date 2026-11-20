<script setup lang="ts">
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'

/**
 * Generic "solved / game over" dialog. Pass the result rows and put buttons into the
 * `actions` slot.
 */
withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    rows: { label: string; value: string; highlight?: boolean }[]
    /** Shown as a badge, e.g. "New personal best!". */
    badge?: string
    /** 0–3 stars (Shapes levels); omitted when undefined. */
    stars?: number
  }>(),
  { subtitle: undefined, badge: undefined, stars: undefined },
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppDialog :open="open" :dismissible="false" @close="emit('close')">
    <div class="result">
      <div class="result__icon" aria-hidden="true">
        <AppIcon name="trophy" :size="36" />
      </div>
      <h2 class="result__title">{{ title }}</h2>
      <p v-if="subtitle" class="result__subtitle">{{ subtitle }}</p>
      <div v-if="stars !== undefined" class="result__stars" :aria-label="`${stars} / 3`">
        <AppIcon
          v-for="i in 3"
          :key="i"
          :name="i <= stars ? 'starFilled' : 'star'"
          :size="32"
          :class="{ 'result__star--on': i <= stars }"
        />
      </div>
      <p v-if="badge" class="result__badge">{{ badge }}</p>
      <dl class="result__rows">
        <div v-for="row in rows" :key="row.label" class="result__row">
          <dt>{{ row.label }}</dt>
          <dd class="tabular" :class="{ 'result__value--highlight': row.highlight }">
            {{ row.value }}
          </dd>
        </div>
      </dl>
    </div>
    <template #actions>
      <slot name="actions" />
    </template>
  </AppDialog>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.result__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-3);
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
  border-radius: var(--radius-full);
  background: var(--color-success-soft);
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: 700;
}

.result__rows {
  width: 100%;
  margin: var(--space-4) 0 0;
}

.result__row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.result__row dt {
  color: var(--color-text-muted);
}

.result__row dd {
  margin: 0;
  font-weight: 700;
}

.result__value--highlight {
  color: var(--color-success);
}
</style>
