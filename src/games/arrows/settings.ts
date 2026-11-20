import { useGameSettings } from '@/core/settings'

/** Arrows settings, persisted under `riddles:arrows:settings`. */
export const arrowsSettings = useGameSettings('arrows', {
  /** Highlight the way of a blocked arrow up to the arrow it bumped into. */
  showBlockedPath: true,
})
