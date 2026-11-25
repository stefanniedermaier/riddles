<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import { pushDialog } from '@/core/dialogs'
import { t } from '@/core/i18n'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Accessible name for dialogs without a visible title. */
    label?: string
    /** Close when tapping the backdrop or pressing Escape. */
    dismissible?: boolean
  }>(),
  { title: undefined, label: undefined, dismissible: true },
)

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
let previouslyFocused: Element | null = null
let release: (() => void) | null = null

function close(): void {
  if (props.dismissible) emit('close')
}

function unregister(): void {
  release?.()
  release = null
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement
      release ??= pushDialog({ panel: () => panel.value, onEscape: close })
      await nextTick()
      panel.value?.focus()
    } else if (release) {
      unregister()
      // The page stops being inert on the next render; only then can it take focus again.
      await nextTick()
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(unregister)
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
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="title ? undefined : label"
          tabindex="-1"
        >
          <header v-if="title || dismissible" class="dialog__header">
            <h2 v-if="title" :id="titleId" class="dialog__title">{{ title }}</h2>
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
  z-index: var(--z-dialog);
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
  /* Square like the rest of the UI (design guide). */
  border-radius: 0;
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
  width: var(--tap-min);
  height: var(--tap-min);
  margin-left: auto;
  margin-right: calc(-1 * var(--space-3));
  /* 44 px tap target without making the header taller than before. */
  margin-block: calc(-1 * var(--space-1));
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
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
