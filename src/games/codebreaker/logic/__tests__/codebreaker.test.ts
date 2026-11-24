import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { consistentGuess, generatePuzzle, isConsistent, isValidGuess, possibleCodes, score } from '../logic'
import { DIFFICULTIES, PARAMS, isCodePuzzle } from '../types'

describe('code breaker scoring', () => {
  it('counts exact and partial matches without counting a peg twice', () => {
    expect(score([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ exact: 4, partial: 0 })
    expect(score([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ exact: 0, partial: 4 })
    expect(score([0, 0, 1, 1], [0, 1, 0, 2])).toEqual({ exact: 1, partial: 2 })
    expect(score([0, 1, 2, 3], [4, 4, 4, 4])).toEqual({ exact: 0, partial: 0 })
    expect(score([0, 0, 0, 1], [1, 1, 1, 0])).toEqual({ exact: 0, partial: 2 })
    expect(score([2, 2, 3, 3], [2, 3, 2, 2])).toEqual({ exact: 1, partial: 2 })
  })

  it('checks consistency and counts the possible codes', () => {
    const puzzle = { seed: 0, difficulty: 'medium' as const, code: [0, 1, 2, 3] }
    expect(possibleCodes(puzzle, [])).toBe(6 ** 4)
    const guesses = [[0, 0, 1, 1]]
    const n = possibleCodes(puzzle, guesses)
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(6 ** 4)
    expect(isConsistent(puzzle.code, guesses, puzzle.code)).toBe(true)
    expect(possibleCodes({ ...puzzle, difficulty: 'easy' }, [])).toBe(6 * 5 * 4 * 3)
  })

  it('validates guesses', () => {
    expect(isValidGuess([0, 1, null, 2], 'medium')).toBe(false)
    expect(isValidGuess([0, 1, 1, 2], 'medium')).toBe(true)
    expect(isValidGuess([0, 1, 1, 2], 'easy')).toBe(false)
  })
})

describe('code breaker generator and hints', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`a consistent strategy always finds the ${difficulty} code within the guess limit`, () => {
      const params = PARAMS[difficulty]
      const rng = createRng(3)
      const rounds = difficulty === 'expert' ? 8 : 20
      for (let round = 0; round < rounds; round++) {
        const puzzle = generatePuzzle(difficulty, rng.int(1e9))
        expect(isCodePuzzle(puzzle)).toBe(true)
        expect(new Set(puzzle.code).size === params.positions || params.repeats).toBe(true)
        const guesses: number[][] = []
        while (guesses.length < params.guesses) {
          const guess = consistentGuess(puzzle, guesses, rng.int(1e9))
          expect(isConsistent(guess, guesses, puzzle.code)).toBe(true)
          expect(isValidGuess(guess, difficulty)).toBe(true)
          guesses.push(guess)
          if (score(puzzle.code, guess).exact === params.positions) break
        }
        expect(guesses.at(-1)).toEqual(puzzle.code)
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('hard', 9)).toEqual(generatePuzzle('hard', 9))
  })
})
