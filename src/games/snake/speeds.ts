import { computed } from 'vue'

import { t } from '@/core/i18n'
import { isSpeed, SPEEDS, type Speed } from './logic/types'
import { snakeSettings } from './settings'

/** The speed options (settings view and lobby). */
export const speedOptions = computed(() => SPEEDS.map((value) => ({ value, label: t(`snake.speeds.${value}`) })))

/** Speed of new runs, as a typed model for `SegmentedControl`. */
export const chosenSpeed = computed<Speed>({
  get: () => (isSpeed(snakeSettings.value.speed) ? snakeSettings.value.speed : 'normal'),
  set: (speed) => {
    snakeSettings.value = { ...snakeSettings.value, speed }
  },
})
