import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Links',
  tagline: 'Verbinde gleiche Punkte und fülle jedes Feld.',
  seo: {
    about: 'Numberlink-Rätsel: Verbinde gleichfarbige Punkte – Linien kreuzen sich nie und jedes Feld wird gefüllt. 5×5 bis 11×11 mit Hinweisen.',
  },
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Verbinde jedes Paar gleichfarbiger Punkte mit einer Linie.',
    fill: 'Linien dürfen sich nicht kreuzen oder verzweigen – und jedes Feld muss gefüllt sein.',
    controls:
      'Ziehe von einem Punkt aus, um zu zeichnen. Zurückziehen kürzt eine Linie; durch eine andere Linie zu zeichnen schneidet sie ab.',
  },
  play: {
    connected: 'Verbunden',
    filled: 'Gefüllt',
    moves: 'Züge',
    undo: 'Rückgängig',
    restart: 'Neustart',
    restartConfirm: 'Alle Linien entfernen?',
    toMenu: 'Links-Menü',
    rules: 'Regeln',
    hintShown: 'Die Linie {color} ist jetzt eingezeichnet.',
    noHint: 'Alle Linien sind bereits richtig.',
    board: 'Links-Spielfeld, {size} mal {size}',
    cell: 'Zeile {row}, Spalte {col}',
    dot: 'Punkt {color}',
    line: 'Linie {color}',
  },
  result: {
    solvedText: 'Alle Punkte sind verbunden und das Feld ist voll.',
    perfectText: 'Perfekt – jede Farbe in einem Zug gezeichnet!',
    moves: 'Züge',
    perfect: 'perfekt',
  },
  settings: {
    showLabels: 'Buchstaben auf Punkten',
    showLabelsDesc:
      'Zeigt einen Buchstaben auf jedem Punkt, damit sich Farben auch ohne Farbsehen unterscheiden lassen.',
  },
}
