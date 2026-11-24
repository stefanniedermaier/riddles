import { useGameSettings } from '@/core/settings'

/** Water Sort settings, persisted under `riddles:watersort:settings`. */
export const waterSortSettings = useGameSettings('watersort', {
  /** A letter on every layer, for players who find some colours hard to tell apart. */
  showSymbols: false,
})
