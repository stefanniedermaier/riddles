import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Sudoku',
  tagline: 'Klassisches Zahlenrätsel mit Notizen und Hinweisen.',
  seo: {
    about: 'Sudoku in vier Schwierigkeitsstufen plus Mini 6×6 – jedes Rätsel ist eindeutig lösbar, Hinweise erklären den nächsten logischen Schritt.',
  },
  modes: {
    label: 'Raster',
    classic: 'Klassisch 9×9',
    mini: 'Mini 6×6',
    miniShort: 'Mini',
  },
  rules: {
    title: 'So wird gespielt',
    goalClassic: 'Fülle das 9×9-Raster so, dass jede Zeile, jede Spalte und jeder 3×3-Block jede Ziffer von 1 bis 9 genau einmal enthält.',
    goalMini: 'Fülle das 6×6-Raster so, dass jede Zeile, jede Spalte und jeder 2×3-Block jede Ziffer von 1 bis 6 genau einmal enthält.',
    input: 'Tippe ein Feld an, dann eine Zahl. „Löschen“ entfernt deine Eingabe, „Rückgängig“ nimmt den letzten Schritt zurück.',
    notes: 'Im Notizmodus notierst du Kandidaten. Ein Hinweis erklärt den nächsten logischen Schritt.',
  },
  lobby: {
    continueDetail: '{difficulty} · {time}',
    best: 'Bestzeit {time}',
    noBest: 'Noch nicht gelöst',
  },
  play: {
    notes: 'Notizen',
    erase: 'Löschen',
    hint: 'Hinweis',
    undo: 'Rückgängig',
    restart: 'Eingaben löschen',
    restartConfirm: 'Alle Eingaben und Notizen entfernen? Die Zeit läuft weiter (rückgängig machbar).',
    newGameConfirm: 'Neues Rätsel ({difficulty}) starten? Das aktuelle geht verloren.',
    remaining: 'noch {count}',
    cellLabel: 'Zeile {row}, Spalte {col}',
    cellGiven: 'vorgegeben {digit}',
    cellValue: '{digit}',
    cellEmpty: 'leer',
    cellNotes: 'Notizen {digits}',
    solvedSubtitle: '{difficulty} gelöst',
    backToLobby: 'Schwierigkeit wählen',
  },
  settings: {
    highlightPeers: 'Zeile, Spalte und Block hervorheben',
    highlightSameDigits: 'Gleiche Ziffern hervorheben',
    autoCleanNotes: 'Notizen automatisch entfernen',
    autoCleanNotesDetail:
      'Eine gesetzte Ziffer wird aus den Notizen in Zeile, Spalte und Block entfernt.',
  },
  techniques: {
    nakedSingle: 'Nackter Single',
    hiddenSingle: 'Versteckter Single',
    pointing: 'Zeigendes Paar',
    claiming: 'Block-Linien-Reduktion',
    nakedPair: 'Nacktes Paar',
    hiddenPair: 'Verstecktes Paar',
    nakedTriple: 'Nacktes Tripel',
    hiddenTriple: 'Verstecktes Tripel',
    xWing: 'X-Wing',
    xyWing: 'XY-Wing',
    swordfish: 'Swordfish',
  },
  units: {
    row: 'Zeile {n}',
    col: 'Spalte {n}',
    box: 'Block {n}',
    cell: 'Z{row}S{col}',
    and: ' und ',
  },
  hint: {
    title: 'Hinweis',
    mistakeTitle: 'Prüfe deine Eingaben',
    mistakeOne: 'Die markierte Eingabe ist falsch.',
    mistakeMany: 'Die {count} markierten Eingaben sind falsch.',
    eraseMistakes: 'Falsche Eingaben löschen',
    revealTitle: 'Probiere diese Zelle',
    reveal: '{cell} muss eine {digit} sein.',
    fillIn: 'Eintragen',
    first: 'Zuerst:',
    then: 'Dann:',
    moreSteps: '(plus {count} {count|weiterer Vorbereitungsschritt|weitere Vorbereitungsschritte})',
    explain: {
      nakedSingle: 'In {cell} ist nur noch eine Ziffer möglich: {digit}.',
      hiddenSingle: 'In {unit} passt die {digit} nur in {cell}.',
      pointing:
        'In {box} kann die {digit} nur in {line} stehen. Daher kann sie aus dem Rest von {line} gestrichen werden.',
      claiming:
        'In {line} kann die {digit} nur in {box} stehen. Daher kann sie aus dem Rest von {box} gestrichen werden.',
      nakedSubset:
        '{cells} in {unit} können nur {digits} enthalten. Diese Ziffern können aus den übrigen Zellen von {unit} gestrichen werden.',
      hiddenSubset:
        'In {unit} passen {digits} nur in {cells}. Alle anderen Ziffern können dort gestrichen werden.',
      fish: 'In {base} passt die {digit} nur in {cover}. Daher kann sie aus dem Rest von {cover} gestrichen werden.',
      xyWing:
        '{pivot} ist {a} oder {b}. In beiden Fällen landet eine {c} in {pincer1} oder {pincer2} – daher kann die {c} aus allen Zellen gestrichen werden, die beide sehen.',
    },
  },
}
