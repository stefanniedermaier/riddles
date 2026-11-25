<script setup lang="ts">
import ToastHost from '@/components/ToastHost.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'
import { dialogOpen } from '@/core/dialogs'
</script>

<template>
  <!-- The page is inert behind an open dialog; toasts and the update banner stay reachable. -->
  <div class="app-page" :inert="dialogOpen">
    <RouterView />
  </div>
  <UpdateBanner />
  <ToastHost />
</template>

<style scoped>
.app-page {
  display: contents;
}
</style>
