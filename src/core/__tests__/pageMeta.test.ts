import { afterEach, describe, expect, it } from 'vitest'

import { applyMeta, metaFor } from '../pageMeta'
import { settings } from '../settings'
import { pageUrl } from '../site'

const ids = ['crowns', 'sudoku']
const head = (selector: string) => document.head.querySelector(selector)

describe('page meta', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    settings.value.locale = 'system'
  })

  it('gives home and game pages their search title, description and address', () => {
    settings.value.locale = 'en'
    expect(metaFor({ name: 'home' }, ids)).toEqual({
      title: 'Riddles – free puzzle games, offline and without ads',
      description: expect.stringContaining('Sudoku'),
      path: '',
    })
    expect(metaFor({ name: 'crowns' }, ids)).toMatchObject({
      title: 'Stars – free online and offline · Riddles',
      description: expect.stringContaining('Star Battle'),
      path: 'stars/',
    })
    expect(metaFor({ name: 'crowns-play' }, ids)).toBeNull()
    expect(metaFor({ name: 'settings' }, ids)).toBeNull()
  })

  it('writes canonical and language alternates, and removes them on other pages', () => {
    settings.value.locale = 'de'
    applyMeta(metaFor({ name: 'sudoku' }, ids))
    expect(head('link[rel="canonical"]')?.getAttribute('href')).toBe(pageUrl('sudoku/', 'de'))
    expect(head('link[hreflang="en"]')?.getAttribute('href')).toBe(pageUrl('sudoku/', 'en'))
    expect(head('link[hreflang="x-default"]')?.getAttribute('href')).toBe(pageUrl('sudoku/', 'en'))
    expect(head('meta[name="description"]')?.getAttribute('content')).toContain('Sudoku')

    applyMeta(null)
    expect(head('link[rel="canonical"]')).toBeNull()
    expect(head('link[hreflang="en"]')).toBeNull()
    expect(head('meta[property="og:url"]')).toBeNull()
    expect(head('meta[name="description"]')?.getAttribute('content')).toContain('Sudoku')
  })
})
