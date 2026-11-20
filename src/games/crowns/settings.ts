import { useGameSettings } from '@/core/settings'

/** Crowns settings, persisted under `riddles:crowns:settings`. */
export const crownsSettings = useGameSettings('crowns', {
  autoMark: true,
  showConflicts: true,
})
