import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

const pwa = vi.hoisted(() => ({
  options: undefined as RegisterSWOptions | undefined,
  activate: vi.fn<(reload?: boolean) => Promise<void>>(async () => {}),
}))
vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: RegisterSWOptions) => {
    pwa.options = options
    return pwa.activate
  },
}))

import {
  applyUpdate,
  checkForUpdate,
  initUpdates,
  resetUpdateState,
  updateAvailable,
} from '../update'

class FakeWorker extends EventTarget {
  constructor(public state: ServiceWorkerState) {
    super()
  }
  become(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

function register(registration: Partial<ServiceWorkerRegistration>) {
  initUpdates()
  pwa.options!.onRegisteredSW!('/riddles/sw.js', registration as ServiceWorkerRegistration)
}

describe('app updates', () => {
  beforeEach(() => {
    resetUpdateState()
    pwa.activate.mockClear()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('reports the latest version when nothing new is found', async () => {
    const update = vi.fn(async () => {})
    register({ update, waiting: null, installing: null } as never)
    await expect(checkForUpdate()).resolves.toBe('current')
    expect(update).toHaveBeenCalledOnce()
  })

  it('waits until a new version is downloaded', async () => {
    const worker = new FakeWorker('installing')
    register({ update: async () => {}, waiting: null, installing: worker } as never)
    const result = checkForUpdate()
    worker.become('installed')
    await Promise.resolve()
    pwa.options!.onNeedRefresh!()
    await expect(result).resolves.toBe('available')
  })

  it('reports a discarded download as failure', async () => {
    const worker = new FakeWorker('installing')
    register({ update: async () => {}, waiting: null, installing: worker } as never)
    const result = checkForUpdate()
    worker.become('redundant')
    await expect(result).resolves.toBe('failed')
  })

  it('returns a waiting version without asking the server again', async () => {
    const update = vi.fn(async () => {})
    register({ update } as never)
    pwa.options!.onNeedRefresh!()
    expect(updateAvailable.value).toBe(true)
    await expect(checkForUpdate()).resolves.toBe('available')
    expect(update).not.toHaveBeenCalled()
  })

  it('knows when it is offline or has no service worker', async () => {
    initUpdates()
    await expect(checkForUpdate()).resolves.toBe('failed')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(checkForUpdate()).resolves.toBe('offline')
  })

  it('activates the new version with a reload', () => {
    initUpdates()
    applyUpdate()
    expect(pwa.activate).toHaveBeenCalledWith(true)
  })
})
