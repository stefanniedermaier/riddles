import type { Component } from 'vue'

import type { GameId } from './types'

/**
 * The logo motif of every game: `src/games/<id>/Logo.vue`, found by file name (a new game
 * only adds its own `Logo.vue`). Loaded eagerly – the home screen shows all of them – and
 * without going through the game modules (they import shared code that imports this).
 */
const files = import.meta.glob<{ default: Component }>('./*/Logo.vue', { eager: true })

export function logoOf(id: GameId): Component {
  const file = files[`./${id}/Logo.vue`]
  if (!file) throw new Error(`No logo for ${id}`)
  return file.default
}
