<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { tripeaks } from './game'
import type { PlayRouteProps } from '../routes'

defineProps<PlayRouteProps>()
</script>

<template>
  <CardGameView :game="tripeaks" :new-game="newGame" />
</template>
