import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

/** German texts of the Bubbles game. */
export const de: Messages<typeof en> = {
  name: 'Bubbles',
  tagline: 'Zielen, über die Wand spielen und drei einer Farbe platzen lassen.',
  seo: {
    about: 'Ein Bubble Shooter: Ziele, lass die Kugel von den Wänden abprallen und bring Gruppen ab drei zum Platzen – endlos, in Leveln mit Zielen oder gegen die Uhr.',
  },
  variants: {
    endless: 'Endlos',
    levels: 'Level',
    time: 'Gegen die Uhr',
  },
  variantDetails: {
    endless: 'Nach einigen Fehlschüssen kommt eine neue Reihe',
    levels: 'Ein Ziel und begrenzte Schüsse',
    time: 'Die Decke sinkt nach Zeit',
  },
  speeds: {
    slow: 'Langsam',
    normal: 'Normal',
    fast: 'Schnell',
  },
  aimLines: {
    short: 'Kurz',
    target: 'Bis zum Ziel',
    full: 'Mit Landepunkt',
  },
  colors: {
    red: 'rote',
    orange: 'orange',
    yellow: 'gelbe',
    green: 'grüne',
    blue: 'blaue',
    purple: 'lila',
  },
  colorNames: {
    red: 'rot',
    orange: 'orange',
    yellow: 'gelb',
    green: 'grün',
    blue: 'blau',
    purple: 'lila',
  },
  goals: {
    clear: 'Räume das Feld ab',
    free: 'Hol die markierten Kugeln herunter',
    color: 'Lass {count} {color} Kugeln platzen',
    score: 'Erreiche {target} Punkte',
  },
  lobby: {
    howToTitle: 'So wird gespielt',
    howTo:
      'Zieh auf dem Feld, um zu zielen, und lass los, um zu schießen. Die Kugel prallt von den Seitenwänden ab. Drei oder mehr sich berührende Kugeln einer Farbe platzen, und alles, was nicht mehr an der Decke hängt, fällt herunter – fallende Kugeln bringen die meisten Punkte.',
    howToModes:
      'Tippe auf die nächste Kugel, um zu tauschen. In Endlos kommt nach einigen Fehlschüssen eine neue Reihe, gegen die Uhr sinkt die Decke von selbst. Lass die Kugeln nicht über die Linie unten kommen.',
    howToSpecials:
      'Treffer in Folge bringen eine Bombe, ein großer Absturz eine Regenbogenkugel, die die Farbe annimmt, die sie am meisten berührt. Graue Steine platzen nie – hol sie herunter.',
    speed: 'Tempo gegen die Uhr',
    continue: 'Weiterspielen · {score} Punkte',
    level: 'Level {level}',
    continueLevel: 'Level {level} weiterspielen',
    stars: '{stars} Sterne',
    best: 'Bestwert {score}',
    bestSpeed: 'Bestwert {score} · {speed}',
  },
  play: {
    board: 'Bubbles-Spielfeld',
    best: 'Bestwert',
    shots: 'Schüsse',
    level: 'Level {level}',
    goal: 'Ziel',
    misses: 'Neue Reihe in',
    drop: 'Decke',
    seconds: '{n} s',
    current: 'Aktuelle Kugel: {bubble}',
    next: 'Nächste Kugel: {bubble} – tippen zum Tauschen',
    swap: 'Kugeln tauschen',
    aim: 'Ziel: {angle}°',
    hint: 'Ziehen zum Zielen, loslassen zum Schießen',
    keys: 'Pfeiltasten zielen, Leertaste schießt, X tauscht',
    resume: 'Pause – tippen zum Weiterspielen',
    start: 'Die Uhr startet mit dem ersten Schuss',
    summary: '{popped} geplatzt, {fallen} gefallen. Noch {left} Kugeln.',
    missed: 'Nichts geplatzt. Noch {left} Kugeln.',
    danger: 'Vorsicht – die Kugeln sind nah an der Linie.',
    special: {
      bomb: 'Bombe',
      rainbow: 'Regenbogenkugel',
      stone: 'Stein',
    },
  },
  pause: {
    title: 'Pause',
    newGame: 'Neues Spiel',
    restartLevel: 'Level neu starten',
    quit: 'Zurück zum Menü',
    confirmNew: 'Dieses Spiel beenden und ein neues starten? Die Punkte werden gewertet.',
  },
  result: {
    gameOver: 'Spiel vorbei',
    levelComplete: 'Level geschafft!',
    levelFailed: 'Keine Schüsse mehr',
    levelFailedText: 'Versuch das Level noch einmal – jedes Level ist mit seinen Schüssen lösbar.',
    level: 'Level',
    shots: 'Schüsse',
    bonus: 'Bonus für übrige Schüsse',
    total: 'Gesamt',
    speed: 'Tempo',
    playAgain: 'Nochmal spielen',
    nextLevel: 'Nächstes Level',
    retry: 'Nochmal versuchen',
    menu: 'Bubbles-Menü',
  },
  settings: {
    aimLine: 'Ziellinie',
    symbols: 'Symbole auf den Kugeln',
    symbolsDetail: 'Eine Form pro Farbe, damit sich die Farben auch ohne Farbsehen unterscheiden lassen.',
    speed: 'Tempo gegen die Uhr',
  },
}
