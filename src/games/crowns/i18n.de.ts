import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Stars',
  tagline: 'Ein Stern pro Zeile, Spalte und Region.',
  seo: {
    about: 'Logikrätsel nach Art von Star Battle: ein Stern pro Zeile, Spalte und Region, Sterne berühren sich nie. 6×6 bis 10×10, rein logisch lösbar.',
  },
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Setze in jede Zeile, jede Spalte und jede farbige Region genau einen Stern.',
    touch: 'Sterne dürfen sich nicht berühren – auch nicht diagonal.',
    controls:
      'Tippe einmal auf ein Feld, um es mit ✕ zu markieren, zweimal für einen Stern und ein drittes Mal zum Leeren. Ziehe über mehrere Felder, um sie gemeinsam zu markieren.',
  },
  play: {
    clear: 'Leeren',
    clearConfirm: 'Alle Sterne und Markierungen entfernen?',
    rules: 'Regeln',
    crownsPlaced: '{placed} / {total} Sterne',
    solvedText: 'Alle Sterne sind gesetzt.',
    undo: 'Rückgängig',
    toMenu: 'Stars-Menü',
  },
  settings: {
    autoMark: 'Blockierte Felder zeigen',
    autoMarkDesc:
      'Ein Punkt kennzeichnet Felder, auf die wegen deiner gesetzten Sterne kein Stern mehr passt.',
    instantConflicts: 'Konflikte sofort zeigen',
    instantConflictsDesc: 'Sterne, die gegen eine Regel verstoßen, werden sofort rot. Sonst zeigt nur „Kontrollieren“ Fehler.',
  },
  unit: {
    row: 'Zeile {n}',
    col: 'Spalte {n}',
    region: 'der markierten Region',
    rows: 'den Zeilen {list}',
    cols: 'den Spalten {list}',
    and: 'und',
  },
  technique: {
    lastCell: 'Letztes freies Feld',
    confinement: 'Eingrenzung',
    forced: 'Blockade',
    groupConfinement: 'Gruppen-Eingrenzung',
    mistake: 'Fehler',
  },
  hint: {
    title: 'Hinweis',
    wrongCrown: 'Dieser Stern gehört nicht zur Lösung.',
    wrongMark: 'Dieses Feld ist markiert, braucht aber einen Stern.',
    fix: 'Entfernen',
    lastCell: 'In {unit} ist nur noch ein Feld frei – dort muss der Stern hin.',
    confinementRegion:
      'Alle freien Felder der markierten Region liegen in {line}. Ihr Stern steht also dort, die übrigen Felder in {line} können markiert werden.',
    confinementLine:
      'Alle freien Felder in {line} gehören zur markierten Region. Deren Stern steht also in {line} – ihre übrigen Felder können markiert werden.',
    forced:
      'Ein Stern auf dem markierten Feld würde alle freien Felder in {unit} blockieren. Dieses Feld kann also markiert werden.',
    groupRegions:
      'Die {count} markierten Regionen haben nur in {lines} freie Felder. Ihre Sterne füllen diese Linien, alle anderen Felder dort können markiert werden.',
    groupLines:
      'In {lines} gibt es nur freie Felder in den {count} markierten Regionen. Diese Regionen bekommen ihre Sterne von dort, ihre übrigen Felder können markiert werden.',
    solved: 'Das Rätsel ist bereits gelöst.',
    stuck: 'Gerade ist kein Hinweis verfügbar.',
  },
}
