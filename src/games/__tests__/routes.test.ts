import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { gameRoutes } from '../registry'
import { playProps } from '../routes'

const router = createRouter({ history: createMemoryHistory(), routes: gameRoutes })

describe('play route props', () => {
  it('passes the path params and `?new=` as `newGame`', () => {
    expect(playProps(router.resolve('/crowns/play?new=easy'))).toEqual({ newGame: 'easy' })
    expect(playProps(router.resolve('/crowns/play'))).toEqual({ newGame: undefined })
    expect(playProps(router.resolve('/merge/play/large?new=1'))).toEqual({ variant: 'large', newGame: '1' })
    // Repeated query values are not a variant.
    expect(playProps(router.resolve('/crowns/play?new=easy&new=hard')).newGame).toBeUndefined()
  })

  it('gives Sudoku its `?mode=` as `requestedMode`', () => {
    const play = gameRoutes.find((r) => r.name === 'sudoku-play')!
    const props = play.props as (route: ReturnType<typeof router.resolve>) => unknown
    expect(props(router.resolve('/sudoku/play?new=easy&mode=mini'))).toEqual({
      newGame: 'easy',
      requestedMode: 'mini',
    })
  })

  it('every play view gets its route values as props', () => {
    for (const route of gameRoutes.filter((r) => String(r.name).endsWith('-play'))) {
      expect({ name: route.name, props: typeof route.props }).toEqual({ name: route.name, props: 'function' })
    }
  })
})
