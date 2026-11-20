import { useGameSettings } from '@/core/settings'

/** Links settings, persisted under `riddles:links:settings`. */
export const linksSettings = useGameSettings('links', {
  showLabels: false,
})
