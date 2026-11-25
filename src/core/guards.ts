/** Small type guards for validating persisted data. */

export const isInt = (value: unknown): value is number => Number.isInteger(value)

export const isNonNegativeInt = (value: unknown): value is number => isInt(value) && value >= 0
