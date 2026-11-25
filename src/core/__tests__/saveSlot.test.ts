import { beforeEach, describe, expect, it } from 'vitest'

import { getGame } from '@/games/registry'
import { saveSlot as minesSlot } from '@/games/mines/index'
import { runMigrations } from '../migrations'
import { defineSaveSlot } from '../saveSlot'
import { load, save } from '../storage'

const isCounter = (raw: unknown): raw is { n: number } =>
  typeof raw === 'object' && raw !== null && Number.isInteger((raw as { n?: unknown }).n)

describe('defineSaveSlot', () => {
  beforeEach(() => localStorage.clear())

  it('stores, loads, validates and clears one value', () => {
    const slot = defineSaveSlot('test:current:v1', isCounter)
    expect(slot.exists()).toBe(false)
    expect(slot.load()).toBeNull()
    slot.save({ n: 3 })
    expect(slot.exists()).toBe(true)
    expect(slot.load()).toEqual({ n: 3 })
    save('test:current:v1', { n: 'three' })
    expect(slot.exists()).toBe(false)
    expect(slot.load()).toBeNull()
    slot.clear()
    expect(load('test:current:v1', null)).toBeNull()
  })

  it('does not offer an invalid save on the home screen', () => {
    save(minesSlot.key, { puzzle: 'from an old version' })
    expect(getGame('mines').hasSavedGame()).toBe(false)
  })
})

describe('runMigrations', () => {
  beforeEach(() => localStorage.clear())

  it('keeps going when a step fails', () => {
    const ran: string[] = []
    runMigrations([
      () => ran.push('a'),
      () => {
        throw new Error('broken')
      },
      () => ran.push('c'),
    ])
    expect(ran).toEqual(['a', 'c'])
  })

  it('migrates old Shapes progress once and drops old level runs', () => {
    save('shapes:progress:v1', { unlocked: 7 })
    save('shapes:current:levels:v1', { any: 'thing' })
    const migrate = getGame('shapes').migrate!
    migrate()
    expect(load('shapes:progress:v2', null)).toEqual({ level: 7 })
    expect(load('shapes:progress:v1', null)).toBeNull()
    expect(load('shapes:current:levels:v1', null)).toBeNull()

    // Idempotent: newer progress is never overwritten.
    save('shapes:progress:v2', { level: 9 })
    save('shapes:progress:v1', { unlocked: 2 })
    migrate()
    expect(load('shapes:progress:v2', null)).toEqual({ level: 9 })
    expect(load('shapes:progress:v1', null)).toBeNull()
  })
})
