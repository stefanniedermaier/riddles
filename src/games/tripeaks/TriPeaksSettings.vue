<script setup lang="ts">
import CardGameSettings from '@/components/cards/CardGameSettings.vue'
import { tripeaks } from './game'
</script>

<template>
  <CardGameSettings :settings="tripeaks.settings" :options="tripeaks.options" />
</template>
