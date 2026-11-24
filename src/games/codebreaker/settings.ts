import { useGameSettings } from '@/core/settings'

/** Code Breaker settings, persisted under `riddles:codebreaker:settings`. */
export const codeBreakerSettings = useGameSettings('codebreaker', {
  /** Mark a complete guess that contradicts earlier feedback before it is submitted. */
  checkGuesses: false,
  /** Show how many codes still fit all feedback. */
  showPossible: false,
})
