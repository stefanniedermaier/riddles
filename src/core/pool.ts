/**
 * Keeps one pre-generated puzzle per difficulty in storage, so "New game" is instant.
 *
 *   const pool = createPuzzlePool<Difficulty, SudokuPuzzle>({
 *     key: 'sudoku:pool:v1',
 *     generate: (difficulty, seed) => generateInWorker({ difficulty, seed }),
 *   })
 *   const puzzle = await pool.take('hard') // cached or freshly generated
 *   pool.warm(['easy', 'medium', 'hard', 'expert']) // fill the pool in the background
 */
import { randomSeed } from './rng'
import { load, save } from './storage'

export interface PuzzlePoolOptions<D extends string, P> {
  /** Storage key, including a schema version, e.g. `sudoku:pool:v1`. */
  key: string
  generate: (difficulty: D, seed: number) => Promise<P>
  /** Rejects stored puzzles that do not match the current format. */
  isValid?: (puzzle: unknown) => puzzle is P
}

export interface PuzzlePool<D extends string, P> {
  /** Returns a ready puzzle (or generates one) and refills the pool in the background. */
  take(difficulty: D): Promise<P>
  /** Starts background generation for every listed difficulty that has no cached puzzle. */
  warm(difficulties: readonly D[]): void
}

export function createPuzzlePool<D extends string, P>(
  options: PuzzlePoolOptions<D, P>,
): PuzzlePool<D, P> {
  const stored = load<Partial<Record<D, P>>>(options.key, {}, (raw) =>
    typeof raw === 'object' && raw !== null ? (raw as Partial<Record<D, P>>) : undefined,
  )
  const pool: Partial<Record<D, P>> = {}
  for (const [difficulty, puzzle] of Object.entries(stored) as [D, unknown][]) {
    if (!options.isValid || options.isValid(puzzle)) pool[difficulty] = puzzle as P
  }

  const inflight = new Map<D, Promise<void>>()

  function persist(): void {
    save(options.key, pool)
  }

  function refill(difficulty: D): Promise<void> {
    const running = inflight.get(difficulty)
    if (running) return running
    const job = options
      .generate(difficulty, randomSeed())
      .then((puzzle) => {
        pool[difficulty] = puzzle
        persist()
      })
      .catch(() => {
        // Background generation failures are not fatal – `take` will generate on demand.
      })
      .finally(() => inflight.delete(difficulty))
    inflight.set(difficulty, job)
    return job
  }

  async function take(difficulty: D): Promise<P> {
    if (pool[difficulty] === undefined && inflight.has(difficulty)) {
      await inflight.get(difficulty)
    }
    const cached = pool[difficulty]
    if (cached !== undefined) {
      delete pool[difficulty]
      persist()
      void refill(difficulty)
      return cached
    }
    const fresh = await options.generate(difficulty, randomSeed())
    void refill(difficulty)
    return fresh
  }

  function warm(difficulties: readonly D[]): void {
    for (const difficulty of difficulties) {
      if (pool[difficulty] === undefined) void refill(difficulty)
    }
  }

  return { take, warm }
}
