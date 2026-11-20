<script setup lang="ts">
import ToastHost from '@/components/ToastHost.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'
</script>

<template>
  <RouterView />
  <UpdateBanner />
  <ToastHost />
</template>
