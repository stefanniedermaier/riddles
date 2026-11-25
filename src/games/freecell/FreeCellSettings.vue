<script setup lang="ts">
import CardGameSettings from '@/components/cards/CardGameSettings.vue'
import { freecell } from './game'
</script>

<template>
  <CardGameSettings :settings="freecell.settings" :options="freecell.options" />
</template>
