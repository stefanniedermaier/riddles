/** Modes (statistics variants) and speeds of Snake. */
export const VARIANTS = ['classic', 'open', 'maze'] as const
export type Variant = (typeof VARIANTS)[number]

/** `calm`: the snake only moves when the player gives a direction (one step per input). */
export const SPEEDS = ['slow', 'normal', 'fast', 'calm'] as const
export type Speed = (typeof SPEEDS)[number]

export type Direction = 'up' | 'down' | 'left' | 'right'
export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right']

export const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

export const isSpeed = (value: unknown): value is Speed => SPEEDS.includes(value as Speed)
