import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Nonogram',
  tagline: 'Fülle das Raster anhand der Zahlenhinweise.',
  seo: {
    about: 'Nonogramme, auch Hanjie oder Malen nach Zahlen: Fülle das Gitter nach den Zahlenhinweisen. 5×5 bis 15×20, eindeutig und logisch lösbar.',
  },
  sizeLabel: '{width}×{height}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Die Zahlen neben jeder Zeile und über jeder Spalte geben die Längen der gefüllten Blöcke in dieser Reihe an – in der richtigen Reihenfolge.',
    gaps: 'Zwischen zwei Blöcken liegt mindestens ein leeres Feld. Jedes Rätsel ist rein logisch lösbar.',
    controls:
      'Wähle Füllen oder Kreuz und tippe ein Feld an – oder ziehe entlang einer Zeile oder Spalte, um mehrere zu markieren. Erneutes Antippen löscht die Markierung.',
  },
  play: {
    fill: 'Füllen',
    cross: 'Kreuz',
    tool: 'Werkzeug',
    undo: 'Rückgängig',
    restart: 'Neustart',
    restartConfirm: 'Alle Markierungen löschen?',
    toMenu: 'Nonogram-Menü',
    rules: 'Regeln',
    mistakes: 'Fehler',
    progress: 'Fertig',
    board: 'Nonogram-Spielfeld, {width} Spalten mal {height} Zeilen',
    noHint: 'Hier lässt sich nichts mehr ableiten.',
    clueEmpty: 'leer',
  },
  hint: {
    wrongTitle: 'Prüfe deine Markierungen',
    wrong: 'Die hervorgehobenen Markierungen sind falsch.',
    fixWrong: 'Fehler entfernen',
    stepTitle: '{line}',
    step: 'Hinweis {clue}: Wie auch immer die Blöcke liegen – die hervorgehobenen Felder sind {what}.',
    fills: '{count} gefüllt',
    crosses: '{count} leer',
    and: '{a} und {b}',
  },
  unit: {
    row: 'Zeile {n}',
    col: 'Spalte {n}',
  },
  result: {
    solvedText: 'Alle Hinweise sind erfüllt.',
    mistakes: 'Fehler',
  },
  settings: {
    instantMistakes: 'Fehler sofort anzeigen',
    instantMistakesDesc: 'Falsche Markierungen werden sofort rot und gezählt. Sonst zeigt sie nur „Kontrollieren“.',
    highlightLines: 'Zeile und Spalte hervorheben',
    highlightLinesDesc: 'Tönt Zeile und Spalte des berührten Feldes ein.',
  },
}
