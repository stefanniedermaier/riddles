import { useGameSettings } from '@/core/settings'

/** Touch screens get the on-screen D-pad by default; it can be turned off. */
const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

/** Snake settings, persisted under `riddles:snake:settings`. */
export const snakeSettings = useGameSettings('snake', {
  /** Speed of new runs (`slow`, `normal`, `fast`, `calm`); a run keeps its speed. */
  speed: 'normal',
  /** On-screen direction buttons below the board. */
  pad: coarsePointer,
})
