<script setup lang="ts">
import CardGameView from '@/components/cards/CardGameView.vue'
import { solitaire } from './game'
import type { PlayRouteProps } from '../routes'

defineProps<PlayRouteProps>()
</script>

<template>
  <CardGameView :game="solitaire" :new-game="newGame" />
</template>
