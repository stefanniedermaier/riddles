import { useGameSettings } from '@/core/settings'

interface NonogramSettings extends Record<string, boolean> {
  /**
   * Wrong marks are shown right away and counted. Off by default: mistakes are only
   * revealed (and counted) when the player taps "Check".
   */
  instantMistakes: boolean
  /** Tint the row and column of the touched cell. */
  highlightLines: boolean
}

/** Nonogram settings, persisted under `riddles:nonogram:settings`. */
export const nonogramSettings = useGameSettings<NonogramSettings>('nonogram', {
  instantMistakes: false,
  highlightLines: true,
})
