import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Arrows',
  tagline: 'Tippe die Pfeile in der richtigen Reihenfolge an und räume das Feld.',
  seo: {
    about: 'Pfeil-Rätsel: Tippe die Pfeile in der richtigen Reihenfolge – jeder gleitet nur hinaus, wenn sein Weg frei ist. 6×6 bis 12×12, mit Hinweisen.',
  },
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Räume das Feld: Tippe einen Pfeil an, und er gleitet in seine Richtung hinaus.',
    blocked: 'Ein Pfeil kommt nur hinaus, wenn bis zum Rand nichts im Weg ist.',
    lives:
      'Ein blockierter Pfeil kostet eines deiner drei Herzen. Finde die richtige Reihenfolge – es gibt immer eine.',
  },
  lobby: {
    savedInfo: '{difficulty} · {size} · noch {left} Pfeile · {time}',
  },
  play: {
    lives: 'Herzen',
    livesValue: 'Noch {lives} von {max} Herzen',
    left: 'Pfeile übrig',
    restart: 'Neu starten',
    restartConfirm: 'Dieses Rätsel noch einmal von vorn beginnen?',
    toMenu: 'Arrows-Menü',
    rules: 'Regeln',
    board: 'Arrows-Feld, {size} mal {size}',
    cell: 'Zeile {row}, Spalte {col}',
    arrowLabel: 'Pfeil nach {direction}',
    hintShown: 'Dieser Pfeil kann jetzt hinaus.',
    blocked: 'Blockiert! Ein Herz verloren.',
  },
  directions: {
    up: 'oben',
    right: 'rechts',
    down: 'unten',
    left: 'links',
  },
  result: {
    solvedText: 'Alle Pfeile haben den Weg hinaus gefunden.',
    failedTitle: 'Keine Herzen mehr',
    failedText: 'Die Pfeile stecken fest. Versuch es noch einmal – es gibt immer einen Weg.',
    livesLeft: 'Herzen übrig',
    arrowsLeft: 'Pfeile übrig',
    tryAgain: 'Nochmal versuchen',
    newPuzzle: 'Neues Rätsel',
  },
  settings: {
    showBlockedPath: 'Zeigen, was einen Pfeil blockiert',
    showBlockedPathDesc: 'Nach einem Anstoßen leuchtet der Weg bis zum blockierenden Pfeil kurz auf.',
    colorByDirection: 'Farbe je Richtung',
    colorByDirectionDesc: 'Jede Richtung bekommt eine eigene Farbe. Macht das Rätsel leichter.',
  },
}
