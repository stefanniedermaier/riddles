import { useGameSettings } from '@/core/settings'

/** Shapes settings, persisted under `riddles:shapes:settings`. */
export const shapesSettings = useGameSettings('shapes', {
  idleHint: true,
})

/** Milliseconds without input before a possible move is highlighted. */
export const IDLE_HINT_MS = 8_000
