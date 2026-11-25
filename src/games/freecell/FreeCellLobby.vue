<script setup lang="ts">
import CardGameLobby from '@/components/cards/CardGameLobby.vue'
import { freecell } from './game'
</script>

<template>
  <CardGameLobby :game="freecell" />
</template>
