/** Variants of the game (kept apart from the rules so the home screen does not load them). */
export const VARIANTS = ['easy', 'medium', 'hard'] as const
export type Variant = (typeof VARIANTS)[number]
