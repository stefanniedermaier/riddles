import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkerClient } from '../worker'

/** A worker whose answers the test controls. */
class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: { preventDefault(): void }) => void) | null = null
  received: { id: number; payload: number }[] = []
  terminated = false
  constructor() {
    FakeWorker.instances.push(this)
  }
  postMessage(message: { id: number; payload: number }): void {
    this.received.push(message)
  }
  terminate(): void {
    this.terminated = true
  }
  answer(index = 0, result?: number): void {
    const { id, payload } = this.received[index]!
    this.onmessage?.({ data: { id, ok: true, result: result ?? payload * 2 } } as MessageEvent)
  }
  crash(): void {
    this.onerror?.({ preventDefault() {} })
  }
}

const fallback = vi.fn(async () => (n: number) => n * 10)
const client = (options = {}) =>
  createWorkerClient<number, number>(() => new FakeWorker() as unknown as Worker, fallback, options)

describe('createWorkerClient', () => {
  beforeEach(() => {
    FakeWorker.instances = []
    fallback.mockClear()
    vi.stubGlobal('Worker', FakeWorker)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('answers requests through the worker', async () => {
    const request = client()
    const result = request(4)
    FakeWorker.instances[0]!.answer()
    await expect(result).resolves.toBe(8)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('terminates an idle worker and starts a new one on demand', async () => {
    const request = client({ idleMs: 1000 })
    const first = request(1)
    FakeWorker.instances[0]!.answer()
    await first
    vi.advanceTimersByTime(999)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)
    vi.advanceTimersByTime(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    const second = request(2)
    expect(FakeWorker.instances).toHaveLength(2)
    FakeWorker.instances[1]!.answer()
    await expect(second).resolves.toBe(4)
  })

  it('keeps a busy worker alive', async () => {
    const request = client({ idleMs: 1000 })
    const slow = request(3)
    vi.advanceTimersByTime(5000)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)
    FakeWorker.instances[0]!.answer()
    await expect(slow).resolves.toBe(6)
  })

  it('falls back to the main thread when a request hangs', async () => {
    const request = client({ timeoutMs: 2000 })
    const hung = request(5)
    vi.advanceTimersByTime(2000)
    await expect(hung).resolves.toBe(50)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)
    // The next request gets a fresh worker.
    const next = request(1)
    expect(FakeWorker.instances).toHaveLength(2)
    FakeWorker.instances[1]!.answer()
    await expect(next).resolves.toBe(2)
  })

  it('falls back to the main thread for good after a crash', async () => {
    const request = client()
    const crashed = request(2)
    FakeWorker.instances[0]!.crash()
    await expect(crashed).resolves.toBe(20)
    await expect(request(3)).resolves.toBe(30)
    expect(FakeWorker.instances).toHaveLength(1)
  })
})
