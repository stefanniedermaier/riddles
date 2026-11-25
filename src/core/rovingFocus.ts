/**
 * Arrow-key navigation for radio groups and tab lists (WAI-ARIA APG "roving tabindex"):
 * only the chosen item is in the tab order (`tabindex="0"`, the others `-1`); arrow keys,
 * Home and End move focus to a sibling with the same role, and the caller selects it.
 */

/** Index the key moves to in a list of `count` items (wrapping), or null for other keys. */
export function rovingTarget(key: string, index: number, count: number): number | null {
  if (count === 0) return null
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/**
 * Handles a keydown on an item of a roving group: focuses the target sibling (same role,
 * same parent) and returns its index for the caller to select, or null if the key does
 * not navigate.
 */
export function onRovingKey(event: KeyboardEvent): number | null {
  const item = event.currentTarget
  if (!(item instanceof HTMLElement) || event.altKey || event.ctrlKey || event.metaKey) return null
  const role = item.getAttribute('role')
  const items = Array.from(item.parentElement?.children ?? []).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.getAttribute('role') === role,
  )
  const target = rovingTarget(event.key, items.indexOf(item), items.length)
  if (target === null) return null
  event.preventDefault()
  items[target]?.focus()
  return target
}

/** `tabindex` for item `index`: the selected item, or the first one if none is selected. */
export function rovingTabindex(index: number, selected: number): 0 | -1 {
  return index === (selected < 0 ? 0 : selected) ? 0 : -1
}
