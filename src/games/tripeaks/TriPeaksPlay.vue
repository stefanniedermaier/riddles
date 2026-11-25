<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { tripeaks } from './game'
</script>

<template>
  <CardGameView :game="tripeaks" />
</template>
