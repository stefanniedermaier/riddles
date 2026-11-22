import { defineAsyncComponent, type Component } from 'vue'

import { getGame } from './registry'
import type { GameId } from './types'

const cache = new Map<GameId, Component>()

/**
 * The settings panel of a game as a (cached) async component, or `null` if the game has no
 * options. Used by the settings view and by the settings dialog inside the games.
 */
export function settingsPanelOf(id: GameId): Component | null {
  const loader = getGame(id).settingsComponent
  if (!loader) return null
  let panel = cache.get(id)
  if (!panel) {
    panel = defineAsyncComponent(loader)
    cache.set(id, panel)
  }
  return panel
}
