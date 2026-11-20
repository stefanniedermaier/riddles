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

/** Call this at the top level of a `*.worker.ts` module. */
export function exposeWorker<Req, Res>(handler: Handler<Req, Res>): void {
  const scope = self as unknown as WorkerScope
  scope.onmessage = async (event: MessageEvent) => {
    const { id, payload } = event.data as RpcRequest<Req>
    try {
      const result = await handler(payload)
      scope.postMessage({ id, ok: true, result } satisfies RpcResponse<Res>)
    } catch (error) {
      scope.postMessage({ id, ok: false, error: String(error) } satisfies RpcResponse<Res>)
    }
  }
}

export function createWorkerClient<Req, Res>(
  createWorker: () => Worker,
  loadFallback: () => Promise<Handler<Req, Res>>,
): (request: Req) => Promise<Res> {
  let worker: Worker | null = null
  let broken = typeof Worker === 'undefined'
  let nextId = 1
  const pending = new Map<number, { resolve: (res: Res) => void; reject: (err: Error) => void }>()

  function failAll(error: Error): void {
    for (const { reject } of pending.values()) reject(error)
    pending.clear()
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
      const entry = pending.get(response.id)
      if (!entry) return
      pending.delete(response.id)
      if (response.ok) entry.resolve(response.result)
      else entry.reject(new Error(response.error))
    }
    worker.onerror = (event) => {
      event.preventDefault()
      broken = true
      worker?.terminate()
      worker = null
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
    const id = nextId++
    return new Promise<Res>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      target.postMessage({ id, payload: request } satisfies RpcRequest<Req>)
    }).catch((error: unknown) => {
      // A crashed worker should not lose the request – retry on the main thread.
      if (error instanceof Error && error.message === 'worker-crashed') return runFallback(request)
      throw error
    })
  }
}
