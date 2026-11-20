import { locale } from './i18n'

/** `83_000` → `"1:23"`, `3_723_000` → `"1:02:03"`. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
  return `${minutes}:${ss}`
}

/** Locale-aware number formatting (thousands separators). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value)
}

/** Locale-aware short date. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(date)
}
