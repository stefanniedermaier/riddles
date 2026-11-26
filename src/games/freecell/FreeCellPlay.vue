<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { freecell } from './game'
import type { PlayRouteProps } from '../routes'

defineProps<PlayRouteProps>()
</script>

<template>
  <CardGameView :game="freecell" :new-game="newGame" />
</template>
