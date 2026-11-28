/** Modes (statistics variants), speeds and the cell codes of Bubbles. */
export const VARIANTS = ['endless', 'levels', 'time'] as const
export type Variant = (typeof VARIANTS)[number]

/** Speeds of the time mode: how fast the ceiling comes down. */
export const SPEEDS = ['slow', 'normal', 'fast'] as const
export type Speed = (typeof SPEEDS)[number]

export const isSpeed = (value: unknown): value is Speed => SPEEDS.includes(value as Speed)

/** Number of bubble colours at most (0 … 5). */
export const COLOR_COUNT = 6

/**
 * A field cell: `EMPTY`, a colour `0 … 5` or `STONE` (cannot pop, only falls).
 * Shots are a colour, `BOMB` or `RAINBOW`.
 */
export const EMPTY = -1
export const STONE = 9
export const BOMB = 10
export const RAINBOW = 11

export type Shot = number

export const isColor = (value: number): boolean => Number.isInteger(value) && value >= 0 && value < COLOR_COUNT
export const isShot = (value: unknown): value is Shot =>
  typeof value === 'number' && (isColor(value) || value === BOMB || value === RAINBOW)
