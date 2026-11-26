import { describe, expect, it } from 'vitest'

import { t } from '@/core/i18n'
import { settings } from '@/core/settings'
import { gameSlug } from '../slugs'
import { gameModules } from '../modules'
import { gameRoutes, games } from '../registry'

describe('game modules', () => {
  it('have unique ids that match their descriptors', () => {
    const ids = gameModules.map((module) => module.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const module of gameModules) expect(module.descriptor.id).toBe(module.id)
  })

  it('only register routes under their own slug (and the id it redirects from)', () => {
    for (const module of gameModules) {
      expect(module.routes.length).toBeGreaterThan(0)
      const prefixes = [gameSlug(module.id), module.id]
      for (const route of module.routes) {
        expect(prefixes.some((p) => route.path === `/${p}` || route.path.startsWith(`/${p}/`))).toBe(true)
      }
    }
  })

  it('feed the registry, the router and the texts', () => {
    expect(games.map((game) => game.id)).toEqual(gameModules.map((module) => module.id))
    expect(gameRoutes).toHaveLength(gameModules.reduce((sum, module) => sum + module.routes.length, 0))
    for (const locale of ['en', 'de'] as const) {
      settings.value.locale = locale
      for (const module of gameModules) {
        expect(t(`${module.id}.name`)).toBe(module.messages[locale].name)
      }
    }
    settings.value.locale = 'system'
  })
})
