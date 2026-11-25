<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { spider } from './game'
</script>

<template>
  <CardGameView :game="spider" />
</template>
