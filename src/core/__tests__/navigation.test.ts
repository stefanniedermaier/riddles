import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { returnTo } from '../navigation'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/crowns', name: 'crowns', component: Empty },
      { path: '/crowns/play', name: 'crowns-play', component: Empty },
    ],
  })
}

describe('returnTo', () => {
  it('goes back when the previous entry is the target (no duplicate history entry)', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.push('/crowns')
    await router.push('/crowns/play')
    window.history.replaceState({ back: '/crowns' }, '')
    await returnTo(router, { name: 'crowns' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(router.currentRoute.value.name).toBe('crowns')
    // One more "back" reaches home – nothing was duplicated.
    router.back()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('replaces the current entry otherwise', async () => {
    const router = makeRouter()
    await router.push('/crowns/play')
    window.history.replaceState({ back: null }, '')
    await returnTo(router, { name: 'crowns' })
    expect(router.currentRoute.value.name).toBe('crowns')
  })
})
