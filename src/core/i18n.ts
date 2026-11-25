/**
 * Minimal typed i18n.
 *
 * Usage in components: `import { t } from '@/core/i18n'` and `{{ t('home.continue') }}`.
 * `t` reads the reactive `locale`, so templates re-render when the language changes.
 */
import { computed, ref, watchEffect } from 'vue'

import type { GameId } from '@/games/types'
import { getMessages, type MessageKey } from '@/i18n'
import { settings } from './settings'

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

export const locale = computed<Locale>(() =>
  settings.value.locale === 'system' ? detectLocale(deviceLanguage.value) : settings.value.locale,
)

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
  const messages = getMessages()
  const text = lookup(messages[locale.value], key) ?? lookup(messages.en, key) ?? key
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

/** Keeps `<html lang>` in sync with the active locale. */
export function installI18n(): void {
  watchEffect(() => {
    document.documentElement.lang = locale.value
  })
}
