import { useGameSettings } from '@/core/settings'

/** Water Sort settings, persisted under `riddles:watersort:settings`. */
export const waterSortSettings = useGameSettings('watersort', {
  /**
   * A letter on every layer, so colours never have to be told apart by hue alone
   * (WCAG 1.4.1). On by default; players can turn it off.
   */
  showSymbols: true,
})
