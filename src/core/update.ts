import { ref, watch } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/**
 * App updates via the service worker (vite-plugin-pwa, `registerType: 'prompt'`).
 * A new version is downloaded in the background and waits until the player activates it –
 * from the update banner or from *Settings → Check for updates*.
 */

/** A new version is installed and waiting to be activated. */
export const updateAvailable = ref(false)
/** The app has been cached completely and works offline. */
export const offlineReady = ref(false)

const HOURLY = 60 * 60 * 1000

let registration: ServiceWorkerRegistration | undefined
let activate: ((reload?: boolean) => Promise<void>) | undefined

/** Registers the service worker once and checks for a new version every hour. */
export function initUpdates(): void {
  if (activate) return
  activate = registerSW({
    immediate: true,
    onNeedRefresh: () => (updateAvailable.value = true),
    onOfflineReady: () => (offlineReady.value = true),
    onRegisteredSW(_url, swRegistration) {
      registration = swRegistration
      if (swRegistration) setInterval(() => void swRegistration.update().catch(() => {}), HOURLY)
    },
  })
}

export type UpdateCheck =
  /** A new version is ready – call `applyUpdate()`. */
  | 'available'
  /** This is the latest version. */
  | 'current'
  /** No network connection. */
  | 'offline'
  /** No service worker (development server, unsupported browser) or the check failed. */
  | 'failed'

/** Asks the server for a new version and waits until it has been downloaded. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (updateAvailable.value) return 'available'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (!registration) return 'failed'
  try {
    await registration.update()
  } catch {
    return navigator.onLine === false ? 'offline' : 'failed'
  }
  const installing = registration.installing
  if (!registration.waiting && !installing) return 'current'
  if (installing && !(await installed(installing))) return 'failed'
  // The plugin prepares the reload when it reports the waiting version (`onNeedRefresh`),
  // which can come slightly later than the worker's state change.
  return (await reported()) ? 'available' : 'failed'
}

const REPORT_TIMEOUT_MS = 10_000

/** Resolves `true` once the waiting version has been reported (`updateAvailable`). */
function reported(): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      stop()
      resolve(false)
    }, REPORT_TIMEOUT_MS)
    const stop = watch(
      updateAvailable,
      (available) => {
        if (!available) return
        clearTimeout(timer)
        queueMicrotask(() => stop())
        resolve(true)
      },
      { immediate: true, flush: 'sync' },
    )
  })
}

/** Resolves once a downloading service worker is installed (`true`) or discarded (`false`). */
function installed(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const settle = () => {
      if (worker.state === 'installing') return
      worker.removeEventListener('statechange', settle)
      resolve(worker.state !== 'redundant')
    }
    worker.addEventListener('statechange', settle)
    settle()
  })
}

/**
 * Activates the waiting version and reloads the app. Running games are saved continuously,
 * so reloading is safe.
 */
export function applyUpdate(): void {
  void activate?.(true)
}

/** Test helper: forget the registration. */
export function resetUpdateState(): void {
  registration = undefined
  activate = undefined
  updateAvailable.value = false
  offlineReady.value = false
}
