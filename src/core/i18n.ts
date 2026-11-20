/**
 * Minimal typed i18n.
 *
 * Usage in components: `import { t } from '@/core/i18n'` and `{{ t('home.continue') }}`.
 * `t` reads the reactive `locale`, so templates re-render when the language changes.
 */
import { computed, ref, watchEffect } from 'vue'

import { messages, type MessageKey } from '@/i18n'
import { settings } from './settings'

export type Locale = 'en' | 'de'
export const locales: readonly Locale[] = ['en', 'de']
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

/** Translates `key`, replacing `{name}` placeholders with `params.name`. */
export function t(key: MessageKey, params?: MessageParams): string {
  const text = lookup(messages[locale.value], key) ?? lookup(messages.en, key) ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** Keeps `<html lang>` in sync with the active locale. */
export function installI18n(): void {
  watchEffect(() => {
    document.documentElement.lang = locale.value
  })
}
