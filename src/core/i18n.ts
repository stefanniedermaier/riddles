/**
 * Minimal typed i18n.
 *
 * Usage in components: `import { t } from '@/core/i18n'` and `{{ t('home.continue') }}`.
 * `t` reads the reactive `locale`, so templates re-render when the language changes.
 *
 * Only the active language is loaded (`loadLocale`, awaited before the app mounts). When the
 * language changes, the other catalogue loads in the background and the app keeps showing
 * the previous language until it is there.
 */
import { computed, ref, shallowRef, watchEffect } from 'vue'

import type { GameId } from '@/games/types'
import { catalogueLoaders, type Catalogue, type MessageKey } from '@/i18n'
import { settings } from './settings'
import { pageLocaleOf } from './site'

export type Locale = 'en' | 'de'
export type { MessageKey }

/** Device language as reported by the browser (reactive to `languagechange`). */
const deviceLanguage = ref(typeof navigator !== 'undefined' ? navigator.language : 'en')
if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    deviceLanguage.value = navigator.language
  })
}

export function detectLocale(language: string): Locale {
  return language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

/** Language of the page (`/riddles/de/…` is German), `null` on the default pages. */
const pageLocale = typeof window !== 'undefined' ? pageLocaleOf(window.location.pathname) : null

/**
 * The wanted language: the setting; with "system" the language of the page (so a German page
 * shows German – also to search engines), otherwise the device language.
 */
const wantedLocale = computed<Locale>(() =>
  settings.value.locale === 'system'
    ? (pageLocale ?? detectLocale(deviceLanguage.value))
    : settings.value.locale,
)

const catalogues = shallowRef<Partial<Record<Locale, Catalogue>>>({})
const loading = new Map<Locale, Promise<void>>()

/** Loads the catalogue of `target` (once; later calls return the same promise). */
export function loadLocale(target: Locale = wantedLocale.value): Promise<void> {
  let pending = loading.get(target)
  if (!pending) {
    pending = catalogueLoaders[target]().then(({ default: catalogue }) => {
      catalogues.value = { ...catalogues.value, [target]: catalogue }
    })
    // A failed load (offline before the service worker cached it) may be retried later.
    pending.catch(() => loading.delete(target))
    loading.set(target, pending)
  }
  return pending
}

/**
 * The language the app shows: the wanted one once its texts are loaded, until then the one
 * that is loaded (with two languages, the previous one).
 */
export const locale = computed<Locale>(() => {
  const wanted = wantedLocale.value
  if (catalogues.value[wanted]) return wanted
  return catalogues.value.en || !catalogues.value.de ? 'en' : 'de'
})

function lookup(source: unknown, key: string): string | undefined {
  let node: unknown = source
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

export type MessageParams = Record<string, string | number>

const pluralRules = new Map<Locale, Intl.PluralRules>()

function pluralOf(count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale.value)
  if (!rules) {
    rules = new Intl.PluralRules(locale.value)
    pluralRules.set(locale.value, rules)
  }
  return rules.select(count)
}

/**
 * Translates `key`, replacing `{name}` placeholders with `params.name`.
 *
 * Plural forms: `{name|one|other}` picks the form for the number `params.name` by the
 * language's plural rules, e.g. `'{count} {count|card|cards}'`.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const text = lookup(catalogues.value[locale.value], key) ?? key
  if (!params) return text
  return text
    .replace(/\{(\w+)\|([^|{}]*)\|([^{}]*)\}/g, (match, name: string, one: string, other: string) =>
      name in params ? (pluralOf(Number(params[name])) === 'one' ? one : other) : match,
    )
    .replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Display name of a game (`<id>.name`). */
export function gameName(id: GameId): string {
  return t(`${id}.name`)
}

/** One-line description of a game (`<id>.tagline`). */
export function gameTagline(id: GameId): string {
  return t(`${id}.tagline`)
}

/**
 * Keeps `<html lang>` in sync with the shown language and loads the texts of the wanted one
 * whenever it changes (settings, device language). Resolves once the first texts are there.
 */
export function installI18n(): Promise<void> {
  watchEffect(() => {
    document.documentElement.lang = locale.value
  })
  watchEffect(() => {
    void loadLocale(wantedLocale.value).catch(() => undefined)
  })
  return loadLocale()
}
