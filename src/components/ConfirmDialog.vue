<script setup lang="ts">
import { t } from '@/core/i18n'
import AppButton from './AppButton.vue'
import AppDialog from './AppDialog.vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message: string
    confirmLabel?: string
    danger?: boolean
  }>(),
  { title: undefined, confirmLabel: undefined, danger: false },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AppDialog :open="open" :title="title" :label="title ? undefined : message" @close="emit('cancel')">
    <p>{{ message }}</p>
    <template #actions>
      <AppButton :variant="danger ? 'danger' : 'primary'" block @click="emit('confirm')">
        {{ confirmLabel ?? t('common.ok') }}
      </AppButton>
      <AppButton variant="ghost" block @click="emit('cancel')">{{ t('common.cancel') }}</AppButton>
    </template>
  </AppDialog>
</template>
