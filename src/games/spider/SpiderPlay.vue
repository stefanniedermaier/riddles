<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { spider } from './game'
import type { PlayRouteProps } from '../routes'

defineProps<PlayRouteProps>()
</script>

<template>
  <CardGameView :game="spider" :new-game="newGame" />
</template>
