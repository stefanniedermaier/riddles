<script setup lang="ts">
/**
 * Material 3 switch (square, design guide): a native checkbox with `role="switch"` over a
 * drawn track. Attributes such as `id`, `aria-label` and `disabled` go to the input.
 */
defineOptions({ inheritAttrs: false })
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <span class="switch">
    <input v-bind="$attrs" v-model="model" type="checkbox" role="switch" class="switch__input" />
    <span class="switch__track" aria-hidden="true" />
  </span>
</template>

<style scoped>
.switch {
  position: relative;
  display: inline-flex;
  flex: none;
}

.switch__input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.switch__input:disabled {
  cursor: not-allowed;
}

.switch__track {
  position: relative;
  box-sizing: border-box;
  width: 52px;
  height: 32px;
  /* Outlined track and a small thumb when off, filled track and a large thumb when on. */
  border: 2px solid color-mix(in srgb, var(--color-text) 45%, transparent);
  border-radius: 0;
  background: var(--color-surface-3);
  transition:
    background-color var(--dur-fast) var(--ease-standard),
    border-color var(--dur-fast) var(--ease-standard);
}

.switch__track::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 6px;
  width: 16px;
  height: 16px;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-text) 55%, transparent);
  transform: translateY(-50%);
  transition:
    left var(--dur-med) var(--ease-emphasized),
    width var(--dur-med) var(--ease-emphasized),
    height var(--dur-med) var(--ease-emphasized),
    background-color var(--dur-fast);
}

.switch__input:checked + .switch__track {
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.switch__input:checked + .switch__track::after {
  left: 22px;
  width: 24px;
  height: 24px;
  background: var(--color-on-accent);
}

.switch__input:disabled + .switch__track {
  opacity: 0.38;
}

.switch__input:focus-visible + .switch__track {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
