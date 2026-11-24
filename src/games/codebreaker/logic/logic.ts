/**
 * Code Breaker logic: scoring guesses, consistency with earlier feedback, counting possible
 * codes and finding a code that fits all feedback (hints).
 */
import { createRng, hashSeed } from '@/core/rng'

import { PARAMS, type CodePuzzle, type Difficulty, type Params } from './types'

export interface Feedback {
  /** Right colour in the right position. */
  exact: number
  /** Right colour in a wrong position (each code peg counts at most once). */
  partial: number
}

export function score(code: readonly number[], guess: readonly number[]): Feedback {
  let exact = 0
  const codeLeft = new Map<number, number>()
  const guessLeft = new Map<number, number>()
  code.forEach((color, i) => {
    if (guess[i] === color) exact++
    else {
      codeLeft.set(color, (codeLeft.get(color) ?? 0) + 1)
      guessLeft.set(guess[i]!, (guessLeft.get(guess[i]!) ?? 0) + 1)
    }
  })
  let partial = 0
  for (const [color, n] of guessLeft) partial += Math.min(n, codeLeft.get(color) ?? 0)
  return { exact, partial }
}

/** A code that would have produced every feedback so far. */
export function isConsistent(code: readonly number[], guesses: readonly (readonly number[])[], secret: readonly number[]): boolean {
  return guesses.every((guess) => {
    const expected = score(secret, guess)
    const actual = score(code, guess)
    return expected.exact === actual.exact && expected.partial === actual.partial
  })
}

const allowed = (code: readonly number[], params: Params) => params.repeats || new Set(code).size === code.length

/** The `index`-th code in counting order (base `colors`). */
function codeAt(index: number, params: Params): number[] {
  const code: number[] = []
  let rest = index
  for (let i = 0; i < params.positions; i++) {
    code.push(rest % params.colors)
    rest = Math.floor(rest / params.colors)
  }
  return code
}

const codeCount = (params: Params) => params.colors ** params.positions

/** Number of codes that fit all feedback so far. */
export function possibleCodes(puzzle: CodePuzzle, guesses: readonly (readonly number[])[]): number {
  const params = PARAMS[puzzle.difficulty]
  let count = 0
  for (let i = 0; i < codeCount(params); i++) {
    const code = codeAt(i, params)
    if (allowed(code, params) && isConsistent(code, guesses, puzzle.code)) count++
  }
  return count
}

/** A code that fits all feedback so far, starting the search at a random place. */
export function consistentGuess(puzzle: CodePuzzle, guesses: readonly (readonly number[])[], seed: number): number[] {
  const params = PARAMS[puzzle.difficulty]
  const total = codeCount(params)
  const start = createRng(seed).int(total)
  for (let i = 0; i < total; i++) {
    const code = codeAt((start + i) % total, params)
    if (allowed(code, params) && isConsistent(code, guesses, puzzle.code)) return code
  }
  return [...puzzle.code] // unreachable: the secret itself always fits
}

export function generatePuzzle(difficulty: Difficulty, seed: number): CodePuzzle {
  const params = PARAMS[difficulty]
  const rng = createRng(hashSeed('codebreaker', seed))
  const code = params.repeats
    ? Array.from({ length: params.positions }, () => rng.int(params.colors))
    : rng.shuffle(Array.from({ length: params.colors }, (_, i) => i)).slice(0, params.positions)
  return { seed, difficulty, code }
}

/** Whether a guess is complete and allowed (no repeats where they are not allowed). */
export function isValidGuess(guess: readonly (number | null)[], difficulty: Difficulty): guess is number[] {
  return guess.every((color) => color !== null) && allowed(guess as number[], PARAMS[difficulty])
}
