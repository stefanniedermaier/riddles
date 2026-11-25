<script setup lang="ts">
import CardGameLobby from '@/components/cards/CardGameLobby.vue'
import { tripeaks } from './game'
</script>

<template>
  <CardGameLobby :game="tripeaks" />
</template>
