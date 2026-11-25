/** Variants of the game (kept apart from the rules so the home screen does not load them). */
export const VARIANTS = ['suits1', 'suits2', 'suits4'] as const
export type Variant = (typeof VARIANTS)[number]
