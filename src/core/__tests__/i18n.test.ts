import { afterEach, describe, expect, it } from 'vitest'

import { detectLocale, locale, t } from '../i18n'
import { settings } from '../settings'

describe('i18n', () => {
  afterEach(() => {
    settings.value.locale = 'system'
  })

  it('detects German and falls back to English', () => {
    expect(detectLocale('de-AT')).toBe('de')
    expect(detectLocale('DE')).toBe('de')
    expect(detectLocale('en-US')).toBe('en')
    expect(detectLocale('fr-FR')).toBe('en')
  })

  it('translates according to the locale setting', () => {
    settings.value.locale = 'en'
    expect(locale.value).toBe('en')
    expect(t('difficulty.hard')).toBe('Hard')
    settings.value.locale = 'de'
    expect(t('difficulty.hard')).toBe('Schwer')
  })

  it('interpolates parameters', () => {
    settings.value.locale = 'en'
    expect(t('settings.version', { version: '1.0.0' })).toBe('Version 1.0.0')
  })

  it('picks plural forms by the language rules', () => {
    settings.value.locale = 'en'
    expect(t('cards.pileCount', { pile: 'Stock', count: 1 })).toBe('Stock: 1 card')
    expect(t('cards.pileCount', { pile: 'Stock', count: 0 })).toBe('Stock: 0 cards')
    expect(t('mines.play.minesLeftValue', { count: 2 })).toBe('2 mines left')
    settings.value.locale = 'de'
    expect(t('cards.pileCount', { pile: 'Stapel', count: 1 })).toBe('Stapel: 1 Karte')
    expect(t('cards.pileCount', { pile: 'Stapel', count: 24 })).toBe('Stapel: 24 Karten')
  })

  it('includes game namespaces', () => {
    settings.value.locale = 'en'
    expect(t('sudoku.name')).toBe('Sudoku')
    expect(t('crowns.name')).toBe('Stars')
    expect(t('shapes.name')).toBe('Shapes')
  })
})
