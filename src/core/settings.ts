import { usePersistentRef } from './storage'

export type LocaleSetting = 'system' | 'en' | 'de'
export type ThemeSetting = 'system' | 'light' | 'dark'
export type MotionSetting = 'system' | 'full' | 'reduced'

export interface AppSettings {
  locale: LocaleSetting
  theme: ThemeSetting
  motion: MotionSetting
}

const defaults: AppSettings = {
  locale: 'system',
  theme: 'system',
  motion: 'system',
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Global app settings, persisted under `riddles:settings`. */
export const settings = usePersistentRef<AppSettings>('settings', defaults, {
  parse: (raw) => {
    if (typeof raw !== 'object' || raw === null) return undefined
    const r = raw as Partial<AppSettings>
    return {
      locale: oneOf(r.locale, ['system', 'en', 'de'], defaults.locale),
      theme: oneOf(r.theme, ['system', 'light', 'dark'], defaults.theme),
      motion: oneOf(r.motion, ['system', 'full', 'reduced'], defaults.motion),
    }
  },
})

/**
 * Helper for game-specific settings: an object of booleans/strings merged with defaults,
 * persisted under `riddles:<gameId>:settings`.
 */
export function useGameSettings<T extends Record<string, boolean | string | number>>(
  gameId: string,
  gameDefaults: T,
) {
  return usePersistentRef<T>(`${gameId}:settings`, { ...gameDefaults }, {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const result = { ...gameDefaults }
      for (const key of Object.keys(gameDefaults) as (keyof T)[]) {
        const value = (raw as Partial<T>)[key]
        if (typeof value === typeof gameDefaults[key]) result[key] = value as T[keyof T]
      }
      return result
    },
  })
}
