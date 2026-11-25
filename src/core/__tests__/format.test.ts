import { afterEach, describe, expect, it } from 'vitest'

import { formatDate, formatDuration, formatNumber } from '../format'
import { settings } from '../settings'

describe('format', () => {
  afterEach(() => {
    settings.value.locale = 'en'
  })

  it('formats durations as m:ss or h:mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(-5000)).toBe('0:00')
    expect(formatDuration(59_999)).toBe('0:59')
    expect(formatDuration(83_000)).toBe('1:23')
    expect(formatDuration(3_723_000)).toBe('1:02:03')
  })

  it('formats numbers and dates for the current locale', () => {
    settings.value.locale = 'en'
    expect(formatNumber(12345)).toBe('12,345')
    expect(formatDate('2026-11-25T12:00:00Z')).toBe('Nov 25, 2026')
    settings.value.locale = 'de'
    expect(formatNumber(12345)).toBe('12.345')
    expect(formatDate('2026-11-25T12:00:00Z')).toBe('25.11.2026')
  })

  it('returns an unreadable date unchanged', () => {
    expect(formatDate('not a date')).toBe('not a date')
  })
})
