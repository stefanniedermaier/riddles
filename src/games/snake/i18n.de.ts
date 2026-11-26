import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

/** German texts of the Snake game. */
export const de: Messages<typeof en> = {
  name: 'Snake',
  tagline: 'Steuere die Schlange, friss und wachse – ohne dich selbst zu beißen.',
  seo: {
    about: 'Das klassische Snake-Spiel: Steuere die Schlange, friss und wachse – in drei Modi und vier Geschwindigkeiten, darunter ein ruhiger Modus Schritt für Schritt.',
  },
  variants: {
    classic: 'Klassisch',
    open: 'Offen',
    maze: 'Labyrinth',
  },
  variantDetails: {
    classic: '15×15 · die Wand beendet das Spiel',
    open: '15×15 · durch die Wand auf die andere Seite',
    maze: '17×17 · Wände und Steine',
  },
  speeds: {
    slow: 'Langsam',
    normal: 'Normal',
    fast: 'Schnell',
    calm: 'Ruhig',
  },
  lobby: {
    howToTitle: 'So wird gespielt',
    howTo:
      'Wische auf dem Spielfeld, nutze die Richtungstasten oder die Pfeiltasten, um die Schlange zu lenken. Jede Frucht macht sie länger. Beiß dich nicht selbst – und stoße in Klassisch und Labyrinth nicht an die Wand.',
    howToCalm:
      'Im ruhigen Tempo bewegt sich die Schlange nur, wenn du eine Richtung gibst: ein Schritt pro Tipp oder Taste, ganz ohne Eile. Schnellere Tempi geben mehr Punkte pro Frucht.',
    speed: 'Tempo',
    continue: 'Weiterspielen · {score} Punkte · {speed}',
    best: 'Bestwert {score} · {speed}',
    bestPlain: 'Bestwert {score}',
  },
  play: {
    board: 'Snake-Spielfeld',
    best: 'Bestwert',
    length: 'Länge',
    start: 'Wischen, tippen oder Pfeiltaste drücken zum Starten',
    resume: 'Pause – tippen zum Weiterspielen',
    hint: 'Wischen, Tasten oder Pfeiltasten verwenden',
    calmHint: 'Jede Richtung bewegt die Schlange um ein Feld',
    pad: 'Richtung',
    up: 'Hoch',
    down: 'Runter',
    left: 'Links',
    right: 'Rechts',
    summary: 'Länge {length}. Frucht: {where}.',
    here: 'gefressen',
    noFood: 'keine mehr',
    towards: {
      up: '{n} hoch',
      down: '{n} runter',
      left: '{n} links',
      right: '{n} rechts',
    },
  },
  pause: {
    title: 'Pause',
    newGame: 'Neues Spiel',
    quit: 'Zurück zum Menü',
    confirmNew: 'Dieses Spiel beenden und ein neues starten? Die Punkte werden gewertet.',
  },
  result: {
    gameOver: 'Spiel vorbei',
    won: 'Das Spielfeld ist voll!',
    length: 'Länge',
    speed: 'Tempo',
    playAgain: 'Nochmal spielen',
    menu: 'Snake-Menü',
  },
  settings: {
    speed: 'Tempo neuer Spiele',
    pad: 'Richtungstasten',
    padDetail: 'Vier Tasten unter dem Spielfeld, zusätzlich zum Wischen.',
  },
}
