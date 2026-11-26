import type { RouteComponent, RouteLocationNormalized, RouteRecordRaw } from 'vue-router'

/** The part of a route the props are made of. */
export type RouteValues = Pick<RouteLocationNormalized, 'params' | 'query'>

type Lazy = () => Promise<RouteComponent | { default: RouteComponent }>

/** The route values a play view gets as props. */
export interface PlayRouteProps {
  /** `?new=<variant>`: start a new game of that variant (without it: resume). */
  newGame?: string
}

export const queryString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

/**
 * Props of a play view: its path params (like `props: true`) plus `?new=` as `newGame`.
 * Query values are not covered by `props: true`, hence a function. The views never read the
 * route themselves.
 */
export function playProps(route: RouteValues): Record<string, unknown> & PlayRouteProps {
  return { ...route.params, newGame: queryString(route.query.new) }
}

/**
 * The two routes of most games: the lobby `/<id>` (`<id>`) and the play view `/<id>/play`
 * (`<id>-play`; `?new=<variant>` starts a new game, without it the saved one is resumed).
 * The play view gets the route values as props (`playProps`).
 *
 * The loaders stay literal `() => import('./…')` calls in each game's `routes.ts`, so every
 * view gets its own chunk.
 */
export function standardRoutes(
  id: string,
  lobby: Lazy,
  play: Lazy,
  props: (route: RouteValues) => Record<string, unknown> = playProps,
): RouteRecordRaw[] {
  return [
    { path: `/${id}`, name: id, component: lobby },
    { path: `/${id}/play`, name: `${id}-play`, component: play, props },
  ]
}
