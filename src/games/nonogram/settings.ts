import { useGameSettings } from '@/core/settings'

interface NonogramSettings extends Record<string, boolean> {
  /** Wrong marks are shown right away and counted. */
  checkMistakes: boolean
  /** Tint the row and column of the touched cell. */
  highlightLines: boolean
}

/** Nonogram settings, persisted under `riddles:nonogram:settings`. */
export const nonogramSettings = useGameSettings<NonogramSettings>('nonogram', {
  checkMistakes: true,
  highlightLines: true,
})
