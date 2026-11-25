/** Variants of the game (kept apart from the rules so the home screen does not load them). */
export const VARIANTS = ['cells4', 'cells3', 'cells2'] as const
export type Variant = (typeof VARIANTS)[number]
