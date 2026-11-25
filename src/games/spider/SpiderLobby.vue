<script setup lang="ts">
import CardGameLobby from '@/components/cards/CardGameLobby.vue'
import { spider } from './game'
</script>

<template>
  <CardGameLobby :game="spider" />
</template>
