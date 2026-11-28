import { computed } from 'vue'

import { t } from '@/core/i18n'
import { isSpeed, SPEEDS, type Speed } from './logic/types'
import { AIM_LINES, bubblesSettings, isAimLine, type AimLine } from './settings'

/** The speed options of the time mode (settings view and lobby). */
export const speedOptions = computed(() => SPEEDS.map((value) => ({ value, label: t(`bubbles.speeds.${value}`) })))

/** Speed of new time runs, as a typed model for `SegmentedControl`. */
export const chosenSpeed = computed<Speed>({
  get: () => (isSpeed(bubblesSettings.value.speed) ? bubblesSettings.value.speed : 'normal'),
  set: (speed) => {
    bubblesSettings.value = { ...bubblesSettings.value, speed }
  },
})

export const aimLineOptions = computed(() => AIM_LINES.map((value) => ({ value, label: t(`bubbles.aimLines.${value}`) })))

export const chosenAimLine = computed<AimLine>({
  get: () => (isAimLine(bubblesSettings.value.aimLine) ? bubblesSettings.value.aimLine : 'target'),
  set: (aimLine) => {
    bubblesSettings.value = { ...bubblesSettings.value, aimLine }
  },
})
