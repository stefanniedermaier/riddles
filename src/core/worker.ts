/**
 * Tiny promise-based RPC for Web Workers.
 *
 * Worker side:
 *   exposeWorker<Request, Response>((req) => generatePuzzle(req))
 *
 * App side:
 *   const generate = createWorkerClient<Request, Response>(
 *     () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
 *     () => import('./logic/generator').then((m) => m.handleRequest),
 *   )
 *   const puzzle = await generate({ difficulty: 'hard', seed })
 *
 * If workers are unavailable or crash, requests fall back to running the handler on the
 * main thread (slower UI, but the game keeps working).
 *
 * An idle worker is terminated after `idleMs` (each one holds its own JS heap – iOS kills
 * memory-hungry installed apps) and recreated on the next request. A request that gets no
 * answer within `timeoutMs` counts as a crash: the worker is replaced and the request runs
 * on the main thread.
 */

export type Handler<Req, Res> = (request: Req) => Res | Promise<Res>

interface RpcRequest<Req> {
  id: number
  payload: Req
}

type RpcResponse<Res> =
  | { id: number; ok: true; result: Res }
  | { id: number; ok: false; error: string }

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage(message: unknown): void
}

function isRpcRequest(data: unknown): data is RpcRequest<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    Number.isInteger((data as RpcRequest<unknown>).id) &&
    'payload' in data
  )
}

/** Call this at the top level of a `*.worker.ts` module. */
export function exposeWorker<Req, Res>(handler: Handler<Req, Res>): void {
  const scope = self as unknown as WorkerScope
  async function answer(id: number, payload: Req): Promise<void> {
    try {
      const result = await handler(payload)
      scope.postMessage({ id, ok: true, result } satisfies RpcResponse<Res>)
    } catch (error) {
      scope.postMessage({ id, ok: false, error: String(error) } satisfies RpcResponse<Res>)
    }
  }
  scope.onmessage = (event: MessageEvent) => {
    // A dedicated worker only receives messages from the page that created it (their origin
    // is empty or our own). Anything else – or a malformed request – is ignored.
    if (event.origin !== '' && event.origin !== self.location.origin) return
    if (!isRpcRequest(event.data)) return
    const { id, payload } = event.data as RpcRequest<Req>
    void answer(id, payload)
  }
}

export interface WorkerClientOptions {
  /** Terminate the worker after this long without requests (default 30 s). */
  idleMs?: number
  /** A request without an answer after this long counts as a crash (default 60 s). */
  timeoutMs?: number
}

export function createWorkerClient<Req, Res>(
  createWorker: () => Worker,
  loadFallback: () => Promise<Handler<Req, Res>>,
  { idleMs = 30_000, timeoutMs = 60_000 }: WorkerClientOptions = {},
): (request: Req) => Promise<Res> {
  let worker: Worker | null = null
  let broken = typeof Worker === 'undefined'
  let nextId = 1
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  const pending = new Map<
    number,
    { resolve: (res: Res) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }
  >()

  function settle(id: number): ReturnType<typeof pending.get> {
    const entry = pending.get(id)
    if (!entry) return undefined
    pending.delete(id)
    clearTimeout(entry.timer)
    if (pending.size === 0) {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(stopWorker, idleMs)
    }
    return entry
  }

  function stopWorker(): void {
    worker?.terminate()
    worker = null
  }

  function failAll(error: Error): void {
    for (const id of [...pending.keys()]) settle(id)?.reject(error)
  }

  function ensureWorker(): Worker | null {
    if (broken) return null
    if (worker) return worker
    try {
      worker = createWorker()
    } catch {
      broken = true
      return null
    }
    worker.onmessage = (event: MessageEvent) => {
      const response = event.data as RpcResponse<Res>
      const entry = settle(response.id)
      if (!entry) return
      if (response.ok) entry.resolve(response.result)
      else entry.reject(new Error(response.error))
    }
    worker.onerror = (event) => {
      event.preventDefault()
      broken = true
      stopWorker()
      failAll(new Error('worker-crashed'))
    }
    return worker
  }

  async function runFallback(request: Req): Promise<Res> {
    const handler = await loadFallback()
    return handler(request)
  }

  return (request: Req) => {
    const target = ensureWorker()
    if (!target) return runFallback(request)
    clearTimeout(idleTimer)
    const id = nextId++
    return new Promise<Res>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Hung: replace the worker (the next request starts a fresh one).
        stopWorker()
        failAll(new Error('worker-crashed'))
      }, timeoutMs)
      pending.set(id, { resolve, reject, timer })
      target.postMessage({ id, payload: request } satisfies RpcRequest<Req>)
    }).catch((error: unknown) => {
      // A crashed worker should not lose the request – retry on the main thread.
      if (error instanceof Error && error.message === 'worker-crashed') return runFallback(request)
      throw error
    })
  }
}
