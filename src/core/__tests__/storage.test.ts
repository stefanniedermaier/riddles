import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import {
  ImportError,
  clearAll,
  exportData,
  has,
  importData,
  listKeys,
  load,
  parseExport,
  save,
  usePersistentRef,
} from '../storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAll()
  })

  it('saves and loads JSON values with prefix', () => {
    save('a', { x: 1 })
    expect(localStorage.getItem('riddles:a')).toBe('{"x":1}')
    expect(load('a', null)).toEqual({ x: 1 })
    expect(has('a')).toBe(true)
  })

  it('falls back on missing, broken or rejected data', () => {
    expect(load('missing', 5)).toBe(5)
    localStorage.setItem('riddles:broken', '{nope')
    expect(load('broken', 'x')).toBe('x')
    save('num', 3)
    expect(load<number | string>('num', 0, (raw) => (typeof raw === 'string' ? raw : undefined))).toBe(0)
  })

  it('persistent refs write back and are shared per key', async () => {
    const a = usePersistentRef('shared', { n: 1 })
    const b = usePersistentRef('shared', { n: 99 })
    expect(b).toBe(a)
    a.value.n = 2
    await nextTick()
    expect(load('shared', null)).toEqual({ n: 2 })
  })

  it('round-trips export and import', () => {
    save('one', 1)
    save('two', { deep: [1, 2] })
    localStorage.setItem('other-app', 'keep')
    const file = exportData('1.2.3')
    expect(file.data).toEqual({ one: 1, two: { deep: [1, 2] } })

    clearAll()
    expect(listKeys()).toEqual([])
    expect(localStorage.getItem('other-app')).toBe('keep')

    importData(parseExport(JSON.stringify(file)))
    expect(load('one', 0)).toBe(1)
    expect(load('two', null)).toEqual({ deep: [1, 2] })
  })

  it('rejects invalid import files', () => {
    expect(() => parseExport('nope')).toThrow(ImportError)
    expect(() => parseExport('{"app":"other","format":1,"data":{}}')).toThrow(ImportError)
    expect(() => parseExport('{"app":"riddles","format":2,"data":{}}')).toThrow(ImportError)
  })
})
