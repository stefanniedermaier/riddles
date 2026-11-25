<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { solitaire } from './game'
</script>

<template>
  <CardGameView :game="solitaire" />
</template>
