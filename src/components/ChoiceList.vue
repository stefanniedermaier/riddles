<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import { t } from '@/core/i18n'
import { useCurrentRoute } from '@/core/share'
import AppIcon from './AppIcon.vue'

/**
 * Vertical list of large tappable choices (difficulties, modes, …).
 *
 * One entry can be marked as a challenge (from a shared result link): `highlight`, or by
 * default the `challenge` query of the route if it matches an item id.
 */
const props = defineProps<{
  items: readonly { id: string; label: string; detail?: string; meta?: string; disabled?: boolean }[]
  highlight?: string
}>()

const route = useCurrentRoute()
const marked = computed(() => {
  if (props.highlight !== undefined) return props.highlight
  const challenge = route.value?.query.challenge
  return typeof challenge === 'string' ? challenge : undefined
})

const list = ref<HTMLElement | null>(null)
onMounted(async () => {
  if (!marked.value) return
  await nextTick()
  list.value?.querySelector('.choice--challenge')?.scrollIntoView?.({ block: 'center' })
})

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <ul ref="list" class="choices">
    <li v-for="item in items" :key="item.id">
      <button
        type="button"
        class="choice"
        :class="{ 'choice--challenge': item.id === marked }"
        :disabled="item.disabled"
        @click="emit('select', item.id)"
      >
        <span class="choice__text">
          <span class="choice__label">
            {{ item.label }}
            <span v-if="item.id === marked" class="choice__badge">{{ t('challenge.badge') }}</span>
          </span>
          <span v-if="item.detail" class="choice__detail">{{ item.detail }}</span>
        </span>
        <span v-if="item.meta" class="choice__meta tabular">{{ item.meta }}</span>
        <AppIcon name="play" :size="26" class="choice__play" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.choice {
  --accent: var(--lobby-accent, var(--color-accent));

  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 68px;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-5);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--color-border));
  border-radius: 0;
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--accent) 9%, var(--color-surface)),
    var(--color-surface) 60%
  );
  /* Material elevated card; hover/press feedback from the state layer and ripple. */
  box-shadow: var(--elevation-1);
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow var(--dur-fast) var(--ease-standard);
}

/* Coloured edge on the left. */
.choice::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 70%, #fff), var(--accent));
}

@media (hover: hover) {
  .choice:hover:not(:disabled) {
    box-shadow: var(--elevation-2);
  }
}

.choice:active:not(:disabled) {
  box-shadow: var(--elevation-1);
}

.choice:disabled {
  opacity: 0.5;
  cursor: default;
}

.choice__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.choice__label {
  font-size: var(--text-lg);
  font-weight: 700;
}

.choice__detail,
.choice__meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Marked by a challenge link: thicker edge in the game colour and a badge. */
.choice--challenge {
  border: 2px solid var(--accent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent),
    var(--elevation-1);
}

.choice__badge {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 1px 8px;
  background: var(--accent);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 800;
  vertical-align: middle;
}

:root[data-theme='dark'] .choice__badge {
  color: var(--color-bg);
}

.choice__play {
  flex: none;
  color: var(--accent);
}
</style>
