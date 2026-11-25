import { describe, expect, it } from 'vitest'

import { appUrl, challengeUrl, isApplePlatform, parseChallenge } from '../share'

const nav = (platform: string, userAgent: string) => ({ platform, userAgent })

describe('isApplePlatform', () => {
  it('detects iPhone, iPad (desktop mode) and Mac', () => {
    expect(isApplePlatform(nav('iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'))).toBe(true)
    expect(isApplePlatform(nav('MacIntel', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'))).toBe(true)
  })

  it('treats Android, Windows and Linux as non-Apple', () => {
    expect(isApplePlatform(nav('Linux armv8l', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)'))).toBe(false)
    expect(isApplePlatform(nav('Win32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'))).toBe(false)
    expect(isApplePlatform(nav('Linux x86_64', 'Mozilla/5.0 (X11; Linux x86_64)'))).toBe(false)
  })
})

describe('challenge links', () => {
  it('link into the lobby with variant, result and kind', () => {
    const url = challengeUrl({ game: 'sudoku', variant: 'mini-hard', result: '3:09', kind: 'time' })
    expect(url).toBe(`${appUrl()}#/sudoku?challenge=mini-hard&result=3%3A09&kind=time`)
  })

  it('reads a valid challenge and rejects unknown variants and odd results', () => {
    const variants = ['easy', 'hard']
    expect(parseChallenge({ challenge: 'hard', result: '12,340', kind: 'score' }, variants)).toEqual({
      variant: 'hard',
      result: '12,340',
      kind: 'score',
    })
    expect(parseChallenge({ challenge: 'nope' }, variants)).toBeNull()
    expect(parseChallenge({}, variants)).toBeNull()
    // Anything but a short time or number is dropped (the variant still counts).
    expect(parseChallenge({ challenge: 'easy', result: 'visit evil.example', kind: 'x' }, variants)).toEqual({
      variant: 'easy',
      result: undefined,
      kind: undefined,
    })
  })
})
