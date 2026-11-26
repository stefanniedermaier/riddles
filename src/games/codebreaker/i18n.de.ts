import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Code Breaker',
  tagline: 'Knacke den versteckten Farbcode – jeder Versuch verrät ein bisschen mehr.',
  seo: {
    about: 'Codeknacker-Logikspiel: Knacke den geheimen Farbcode – die Stifte zeigen, wie nah du bist. 4 bis 6 Stellen, 6 bis 8 Farben mit Formen.',
  },
  sizeLabel: '{positions} Stecker · {colors} Farben',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Finde den versteckten Code aus farbigen Steckern mit den erlaubten Versuchen.',
    feedback:
      'Nach jedem Versuch bedeutet ein voller Punkt: richtige Farbe an der richtigen Stelle, ein Ring: richtige Farbe an der falschen Stelle.',
    order: 'Die Punkte verraten nicht, zu welchem Stecker sie gehören.',
    repeats: 'Bei Leicht kommt jede Farbe höchstens einmal vor, ab Mittel können sich Farben wiederholen.',
  },
  play: {
    guessesLeft: 'Versuche',
    possible: 'Möglich',
    guess: 'Raten',
    clear: 'Leeren',
    restart: 'Neuer Code',
    restartConfirm: 'Diesen Code aufgeben und einen neuen beginnen?',
    toMenu: 'Code-Breaker-Menü',
    rules: 'Regeln',
    colors: 'Farben',
    color: 'Farbe {n}',
    secret: 'Versteckter Code',
    hidden: 'verdeckt',
    row: 'Versuch {n}',
    slot: 'Stelle {n}',
    emptySlot: 'leer',
    feedback: '{exact} an der richtigen Stelle, {partial} an der falschen Stelle',
    contradicts: 'Dieser Versuch widerspricht früheren Hinweisen.',
    repeatsNotAllowed: 'Bei Leicht jede Farbe nur einmal.',
    hintFilled: 'Der Versuch passt jetzt zu allen bisherigen Hinweisen.',
  },
  colorNames: {
    c0: 'roter Kreis',
    c1: 'blaues Quadrat',
    c2: 'grünes Dreieck',
    c3: 'gelbe Raute',
    c4: 'oranger Stern',
    c5: 'lila Plus',
    c6: 'türkises Sechseck',
    c7: 'rosa Herz',
  },
  result: {
    solvedText: 'Du hast den Code geknackt.',
    guesses: 'Versuche',
    lostTitle: 'Keine Versuche mehr',
    lostText: 'Der Code steht jetzt oben.',
    newCode: 'Neuer Code',
  },
  settings: {
    checkGuesses: 'Versuche prüfen',
    checkGuessesDesc: 'Warnt vor dem Raten, wenn ein Versuch früheren Hinweisen widerspricht.',
    showPossible: 'Mögliche Codes zeigen',
    showPossibleDesc: 'Zeigt, wie viele Codes noch zu allen Hinweisen passen.',
  },
}
