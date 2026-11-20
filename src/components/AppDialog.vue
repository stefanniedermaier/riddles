<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { t } from '@/core/i18n'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Close when tapping the backdrop or pressing Escape. */
    dismissible?: boolean
  }>(),
  { title: undefined, dismissible: true },
)

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let previouslyFocused: Element | null = null

function close(): void {
  if (props.dismissible) emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      panel.value?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-backdrop" @click.self="close">
        <div
          ref="panel"
          class="dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header v-if="title || dismissible" class="dialog__header">
            <h2 class="dialog__title">{{ title }}</h2>
            <button
              v-if="dismissible"
              type="button"
              class="dialog__close"
              :aria-label="t('common.close')"
              @click="close"
            >
              <AppIcon name="close" :size="20" />
            </button>
          </header>
          <div class="dialog__body">
            <slot />
          </div>
          <footer v-if="$slots.actions" class="dialog__actions">
            <slot name="actions" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  background: var(--color-overlay);
}

.dialog {
  width: 100%;
  max-width: 420px;
  max-height: calc(100dvh - 2 * var(--space-4));
  overflow: auto;
  padding: var(--space-4) var(--space-5) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  outline: none;
}

.dialog__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.dialog__title {
  flex: 1;
  font-size: var(--text-xl);
  font-weight: 700;
}

.dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: calc(-1 * var(--space-2));
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
}

.dialog__close:active {
  background: var(--color-surface-2);
}

.dialog__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--dur-med) var(--ease-out);
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform var(--dur-med) var(--ease-out);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  transform: translateY(16px) scale(0.98);
}
</style>
