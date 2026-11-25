<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { freecell } from './game'
</script>

<template>
  <CardGameView :game="freecell" />
</template>
