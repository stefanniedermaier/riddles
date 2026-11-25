import type { RouteComponent, RouteRecordRaw } from 'vue-router'

type Lazy = () => Promise<RouteComponent | { default: RouteComponent }>

/**
 * The two routes of most games: the lobby `/<id>` (`<id>`) and the play view `/<id>/play`
 * (`<id>-play`; `?new=<variant>` starts a new game, without it the saved one is resumed).
 *
 * The loaders stay literal `() => import('./…')` calls in each game's `routes.ts`, so every
 * view gets its own chunk.
 */
export function standardRoutes(id: string, lobby: Lazy, play: Lazy): RouteRecordRaw[] {
  return [
    { path: `/${id}`, name: id, component: lobby },
    { path: `/${id}/play`, name: `${id}-play`, component: play },
  ]
}
