import { useGameSettings } from '@/core/settings'

/** Crowns settings, persisted under `riddles:crowns:settings`. */
export const crownsSettings = useGameSettings('crowns', {
  autoMark: true,
  /**
   * Crowns that break a rule turn red right away. Off by default: mistakes are only shown
   * when the player taps "Check".
   */
  instantConflicts: false,
})
