<script setup lang="ts">
import CardGameSettings from '@/components/cards/CardGameSettings.vue'
import { spider } from './game'
</script>

<template>
  <CardGameSettings :settings="spider.settings" :options="spider.options" />
</template>
