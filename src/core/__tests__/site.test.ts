import { describe, expect, it } from 'vitest'

import { BASE, legacyHashTarget, pageLocaleOf, pageUrl, routerBase } from '../site'

describe('site', () => {
  it('knows the page language from the path', () => {
    expect(pageLocaleOf('/riddles/', '/riddles/')).toBeNull()
    expect(pageLocaleOf('/riddles/sudoku/', '/riddles/')).toBeNull()
    expect(pageLocaleOf('/riddles/de/', '/riddles/')).toBe('de')
    expect(pageLocaleOf('/riddles/de', '/riddles/')).toBe('de')
    expect(pageLocaleOf('/riddles/de/stars/play', '/riddles/')).toBe('de')
    expect(pageLocaleOf('/riddles/deck/', '/riddles/')).toBeNull()
  })

  it('runs the router under the language prefix', () => {
    expect(routerBase('/riddles/mines/', '/riddles/')).toBe('/riddles/')
    expect(routerBase('/riddles/de/mines/', '/riddles/')).toBe('/riddles/de/')
  })

  it('turns old hash links into paths', () => {
    const at = (pathname: string, hash: string) => legacyHashTarget({ pathname, hash }, '/riddles/')
    expect(at('/riddles/', '')).toBeNull()
    expect(at('/riddles/', '#top')).toBeNull()
    expect(at('/riddles/', '#/')).toBe('/riddles/')
    expect(at('/riddles/', '#/sudoku?challenge=hard&result=3%3A09')).toBe('/riddles/sudoku?challenge=hard&result=3%3A09')
    expect(at('/riddles/', '#/crowns/play')).toBe('/riddles/crowns/play')
  })

  it('builds absolute page URLs per language', () => {
    const origin = 'https://stefanniedermaier.github.io'
    expect(pageUrl('')).toBe(`${origin}${BASE}`)
    expect(pageUrl('stars/', 'de')).toBe(`${origin}${BASE}de/stars/`)
  })
})
