/**
 * A storage slot for one running game: key and validation in one place.
 *
 * Home ("Continue" badge), the lobby and the play view all ask the same slot, so a stored
 * value that is invalid or from an old schema counts as "no saved game" everywhere.
 */
import { has, load, remove, save } from './storage'

export interface SaveSlot<T> {
  readonly key: string
  /** The stored game, or `null` if there is none or it does not pass validation. */
  load(): T | null
  /** Stores the game; `false` if storage is unavailable or full. */
  save(value: T): boolean
  clear(): void
  /** Whether a **valid** game is stored. */
  exists(): boolean
}

export function defineSaveSlot<T>(key: string, isValid: (raw: unknown) => raw is T): SaveSlot<T> {
  const read = (): T | null => load<T | null>(key, null, (raw) => (isValid(raw) ? raw : undefined))
  return {
    key,
    load: read,
    save: (value) => save(key, value),
    clear: () => remove(key),
    exists: () => has(key) && read() !== null,
  }
}
