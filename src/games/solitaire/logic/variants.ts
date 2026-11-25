/** Variants of the game (kept apart from the rules so the home screen does not load them). */
export const VARIANTS = ['draw1', 'draw1-1pass', 'draw3', 'draw3-3pass'] as const
export type Variant = (typeof VARIANTS)[number]
