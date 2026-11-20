<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'

/** Temporary placeholder used while a game is being implemented. */
defineProps<{ title: string }>()
</script>

<template>
  <AppBar :title="title" back-to="/" />
  <main class="page">
    <p class="muted">…</p>
  </main>
</template>
