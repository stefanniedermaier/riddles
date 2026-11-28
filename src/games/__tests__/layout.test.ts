import { beforeEach, describe, expect, it } from 'vitest'

import {
  gameLayout,
  isGameEnabled,
  moveGame,
  normalizeLayout,
  orderedGames,
  setGameEnabled,
  visibleGames,
} from '../layout'
import type { GameId } from '../types'

const known: GameId[] = ['sudoku', 'crowns', 'links', 'nonogram', 'arrows', 'shapes', 'merge', 'blocks', 'snake', 'bubbles', 'mines', 'pipes', 'watersort', 'codebreaker', 'solitaire', 'spider', 'freecell', 'tripeaks']

describe('game layout', () => {
  beforeEach(() => {
    gameLayout.value = normalizeLayout(null)
  })

  it('defaults to the registry order with every game enabled', () => {
    expect(normalizeLayout(null, known)).toEqual({ order: known, disabled: [] })
  })

  it('drops unknown/duplicate ids and appends games added in an update (enabled)', () => {
    const stored = { order: ['shapes', 'tetris', 'shapes', 'sudoku'], disabled: ['crowns', 'tetris'] }
    expect(normalizeLayout(stored, known)).toEqual({
      order: ['shapes', 'sudoku', 'crowns', 'links', 'nonogram', 'arrows', 'merge', 'blocks', 'snake', 'bubbles', 'mines', 'pipes', 'watersort', 'codebreaker', 'solitaire', 'spider', 'freecell', 'tripeaks'],
      disabled: ['crowns'],
    })
  })

  it('keeps at least one game enabled', () => {
    const allOff = normalizeLayout({ order: known, disabled: known }, known)
    expect(allOff.disabled).not.toContain('sudoku')
    expect(allOff.disabled).toHaveLength(known.length - 1)

    for (const id of known.slice(1)) setGameEnabled(id, false)
    setGameEnabled('sudoku', false) // last one – refused
    expect(isGameEnabled('sudoku')).toBe(true)
    expect(visibleGames.value.map((game) => game.id)).toEqual(['sudoku'])
  })

  it('moves games and reflects order and visibility in the computed lists', () => {
    moveGame('shapes', 0)
    moveGame('sudoku', 99)
    expect(orderedGames.value.map((game) => game.id)).toEqual([
      'shapes',
      'crowns',
      'links',
      'nonogram',
      'arrows',
      'merge',
      'blocks',
      'snake',
      'bubbles',
      'mines',
      'pipes',
      'watersort',
      'codebreaker',
      'solitaire',
      'spider',
      'freecell',
      'tripeaks',
      'sudoku',
    ])
    setGameEnabled('links', false)
    expect(visibleGames.value.map((game) => game.id)).toEqual(['shapes', 'crowns', 'nonogram', 'arrows', 'merge', 'blocks', 'snake', 'bubbles', 'mines', 'pipes', 'watersort', 'codebreaker', 'solitaire', 'spider', 'freecell', 'tripeaks', 'sudoku'])
    setGameEnabled('links', true)
    expect(visibleGames.value).toHaveLength(known.length)
  })
})
