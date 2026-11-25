<script setup lang="ts">
import CardGameLobby from '@/components/cards/CardGameLobby.vue'
import { solitaire } from './game'
</script>

<template>
  <CardGameLobby :game="solitaire" />
</template>
