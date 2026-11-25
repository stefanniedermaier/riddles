/**
 * One-off migrations of stored data, run once at start-up (`main.ts`) before any view reads
 * its data. Games contribute steps through `GameDescriptor.migrate`.
 *
 * Every step must be idempotent (check, convert, remove the old key) – it runs on every
 * start, which costs a few `localStorage` lookups. A failing step never stops the app.
 *
 * Settings need no versioning: they are parsed field by field with defaults, so unknown or
 * missing fields are tolerated.
 */
export function runMigrations(steps: readonly (() => void)[]): void {
  for (const step of steps) {
    try {
      step()
    } catch {
      // Keep going: old data that cannot be migrated is simply ignored by its reader.
    }
  }
}
