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
  // Fixed-size counters (at most 8 colours): this runs for every possible code when counting.
  const codeLeft = new Uint8Array(16)
  const guessLeft = new Uint8Array(16)
  let exact = 0
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) exact++
    else {
      codeLeft[code[i]!]! += 1
      guessLeft[guess[i]!]! += 1
    }
  }
  let partial = 0
  for (let c = 0; c < 16; c++) partial += Math.min(codeLeft[c]!, guessLeft[c]!)
  return { exact, partial }
}

/** A code that would have produced every feedback so far. */
export function isConsistent(code: readonly number[], guesses: readonly (readonly number[])[], secret: readonly number[]): boolean {
  return fitsAll(code, guesses, guesses.map((guess) => score(secret, guess)))
}

function fitsAll(code: readonly number[], guesses: readonly (readonly number[])[], feedback: readonly Feedback[]): boolean {
  for (let i = 0; i < guesses.length; i++) {
    const actual = score(code, guesses[i]!)
    if (actual.exact !== feedback[i]!.exact || actual.partial !== feedback[i]!.partial) return false
  }
  return true
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
  const feedback = guesses.map((guess) => score(puzzle.code, guess))
  let count = 0
  for (let i = 0; i < codeCount(params); i++) {
    const code = codeAt(i, params)
    if (allowed(code, params) && fitsAll(code, guesses, feedback)) count++
  }
  return count
}

/** A code that fits all feedback so far, starting the search at a random place. */
export function consistentGuess(puzzle: CodePuzzle, guesses: readonly (readonly number[])[], seed: number): number[] {
  const params = PARAMS[puzzle.difficulty]
  const total = codeCount(params)
  const start = createRng(seed).int(total)
  const feedback = guesses.map((guess) => score(puzzle.code, guess))
  for (let i = 0; i < total; i++) {
    const code = codeAt((start + i) % total, params)
    if (allowed(code, params) && fitsAll(code, guesses, feedback)) return code
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
