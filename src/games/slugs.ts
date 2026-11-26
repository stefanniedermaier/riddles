/**
 * URL slug of each game: its id, unless the game was renamed after its id was chosen.
 * Ids stay stable (storage keys, statistics); only the address follows the name.
 * Kept free of imports: `scripts/prerender.mjs` reads it with Node.
 */
const RENAMED_SLUGS: Readonly<Record<string, string>> = { crowns: 'stars' }

/** Path segment of a game (`crowns` → `stars`). */
export function gameSlug(id: string): string {
  return RENAMED_SLUGS[id] ?? id
}
