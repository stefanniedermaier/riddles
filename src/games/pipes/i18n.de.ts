import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Pipes',
  tagline: 'Drehe die Kacheln, bis das Wasser jedes Rohr erreicht.',
  seo: {
    about: 'Rohr-Rätsel: Drehe die Teile, bis das Wasser aus der Quelle jede Leitung ohne offene Enden erreicht. Expert-Modus mit drei Quellen.',
  },
  sizeLabel: '{width}×{height}',
  variantLabel: '{difficulty} · {size}',
  sources: '{n} Quellen',
  rules: {
    title: 'So wird gespielt',
    goal: 'Drehe die Kacheln so, dass alle Rohre ein Netz bilden, das mit der Quelle verbunden ist.',
    rotate: 'Tippe eine Kachel an, um sie im Uhrzeigersinn zu drehen. Wasser füllt jedes Rohr, das mit der Quelle verbunden ist.',
    ends: 'Gelöst, wenn jede Kachel Wasser hat und kein Rohr offen endet oder aus dem Feld zeigt.',
    lock: 'Halte eine Kachel gedrückt (oder Rechtsklick), um sie zu sperren – dann dreht sie sich nicht aus Versehen.',
    sources: 'Experte hat drei nummerierte Quellen mit je eigener Farbe. Jedes Rohr braucht Wasser aus genau einer Quelle – verbinden sich zwei Netze, mischt sich das Wasser (rot) und das Rätsel ist nicht gelöst.',
  },
  play: {
    moves: 'Züge',
    connected: 'Wasser',
    undo: 'Rückgängig',
    restart: 'Neu starten',
    restartConfirm: 'Dieses Rätsel noch einmal von vorn beginnen?',
    toMenu: 'Pipes-Menü',
    rules: 'Regeln',
    board: 'Pipes-Feld, {width} Spalten mal {height} Zeilen',
    cell: 'Zeile {row}, Spalte {col}',
    source: 'Quelle',
    sourceN: 'Quelle {n}',
    water: 'mit Wasser',
    waterN: 'Wasser aus Quelle {n}',
    mixed: 'gemischtes Wasser',
    locked: 'gesperrt',
    hintTurn: 'Drehe die markierte Kachel so – sie ist jetzt gesperrt.',
    hintUnlock: 'Diese gesperrte Kachel ist falsch gedreht – sie ist jetzt entsperrt.',
    noHint: 'Kein Hinweis verfügbar.',
    directions: 'Rohre nach {list}',
  },
  directions: {
    up: 'oben',
    right: 'rechts',
    down: 'unten',
    left: 'links',
  },
  result: {
    solvedText: 'Das Wasser erreicht jedes Rohr.',
  },
}
