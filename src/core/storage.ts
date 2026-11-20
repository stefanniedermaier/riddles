/**
 * Namespaced, fault-tolerant wrapper around `localStorage`.
 *
 * - Every key is prefixed with `riddles:`.
 * - Values are stored as JSON.
 * - Schema versions are part of the key (e.g. `sudoku:current:v1`), so data written by an
 *   incompatible older version is simply ignored.
 * - Storage failures (private mode, quota exceeded) never crash the app.
 */
import { ref, watch, type Ref } from 'vue'

export const STORAGE_PREFIX = 'riddles:'

function backend(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Reads and parses a value. Returns `fallback` if missing, unreadable or rejected by `parse`. */
export function load<T>(key: string, fallback: T, parse?: (raw: unknown) => T | undefined): T {
  const store = backend()
  if (!store) return fallback
  try {
    const text = store.getItem(STORAGE_PREFIX + key)
    if (text === null) return fallback
    const raw: unknown = JSON.parse(text)
    if (!parse) return raw as T
    const parsed = parse(raw)
    return parsed === undefined ? fallback : parsed
  } catch {
    return fallback
  }
}

/** Serialises and stores a value. Returns `false` if the value could not be stored. */
export function save(key: string, value: unknown): boolean {
  const store = backend()
  if (!store) return false
  try {
    store.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function remove(key: string): void {
  try {
    backend()?.removeItem(STORAGE_PREFIX + key)
  } catch {
    // ignore
  }
}

export function has(key: string): boolean {
  try {
    return backend()?.getItem(STORAGE_PREFIX + key) != null
  } catch {
    return false
  }
}

/** All keys (without prefix) that belong to this app. */
export function listKeys(): string[] {
  const store = backend()
  if (!store) return []
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key.slice(STORAGE_PREFIX.length))
  }
  return keys.sort()
}

/** Removes every key that belongs to this app. */
export function clearAll(): void {
  for (const key of listKeys()) remove(key)
  persistentRefs.clear()
}

const persistentRefs = new Map<string, Ref<unknown>>()

export interface PersistentRefOptions<T> {
  /** Validates / migrates raw stored data; return `undefined` to fall back to the default. */
  parse?: (raw: unknown) => T | undefined
}

/**
 * A Vue ref that is loaded from storage once and written back on every (deep) change.
 * Refs are shared per key, so all components see the same reactive value.
 */
export function usePersistentRef<T>(
  key: string,
  fallback: T,
  options: PersistentRefOptions<T> = {},
): Ref<T> {
  const existing = persistentRefs.get(key)
  if (existing) return existing as Ref<T>

  const state = ref(load(key, fallback, options.parse)) as Ref<T>
  watch(state, (value) => save(key, value), { deep: true, flush: 'sync' })
  persistentRefs.set(key, state as Ref<unknown>)
  return state
}

// ---------------------------------------------------------------------------
// Export / import

export interface ExportFile {
  app: 'riddles'
  format: 1
  version: string
  exportedAt: string
  data: Record<string, unknown>
}

export class ImportError extends Error {}

export function exportData(version: string): ExportFile {
  const data: Record<string, unknown> = {}
  for (const key of listKeys()) {
    data[key] = load<unknown>(key, null)
  }
  return { app: 'riddles', format: 1, version, exportedAt: new Date().toISOString(), data }
}

/** Parses and validates the text of an export file. Throws `ImportError` when invalid. */
export function parseExport(text: string): ExportFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError('not-json')
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as ExportFile).app !== 'riddles' ||
    (raw as ExportFile).format !== 1 ||
    typeof (raw as ExportFile).data !== 'object' ||
    (raw as ExportFile).data === null
  ) {
    throw new ImportError('wrong-format')
  }
  return raw as ExportFile
}

/** Replaces all app data with the content of an export file. Reload the app afterwards. */
export function importData(file: ExportFile): void {
  clearAll()
  for (const [key, value] of Object.entries(file.data)) {
    save(key, value)
  }
}

/**
 * Asks the browser to keep our storage even under storage pressure
 * (most relevant for Safari/iOS, which may evict data of rarely used sites).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
