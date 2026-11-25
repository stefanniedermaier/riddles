<script setup lang="ts">
import CardGameSettings from '@/components/cards/CardGameSettings.vue'
import { solitaire } from './game'
</script>

<template>
  <CardGameSettings :settings="solitaire.settings" :options="solitaire.options" />
</template>
