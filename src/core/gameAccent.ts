/**
 * While a game's lobby or play view is shown, the app's accent colour becomes the game's
 * colour: primary buttons, selections, focus rings and highlights then match the game
 * (e.g. the "Guess" button in Code Breaker is orange, not the app's violet).
 *
 * Sets `--game-current` and `data-game` on `<html>`; base.css maps the accent tokens.
 * Views register on a stack, because the next view mounts before the previous one unmounts.
 */
import { onBeforeUnmount, onMounted } from 'vue'

const active: string[] = []

function apply(): void {
  const root = document.documentElement
  const game = active[active.length - 1]
  if (game) {
    root.dataset.game = game
    root.style.setProperty('--game-current', `var(--game-${game})`)
  } else {
    delete root.dataset.game
    root.style.removeProperty('--game-current')
  }
}

export function useGameAccent(game: () => string): void {
  let entry: string | null = null
  onMounted(() => {
    entry = game()
    active.push(entry)
    apply()
  })
  onBeforeUnmount(() => {
    const index = entry === null ? -1 : active.lastIndexOf(entry)
    if (index >= 0) active.splice(index, 1)
    apply()
  })
}
