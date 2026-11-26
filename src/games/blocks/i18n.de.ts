import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Blocks',
  tagline: 'Lege Blöcke und räume volle Reihen und Spalten ab.',
  seo: {
    about: 'Block-Puzzle: Lege je drei Teile auf ein 8×8-Feld und räume volle Reihen und Spalten ab. Kombos und ein leeres Feld bringen Bonuspunkte.',
  },
  variants: {
    classic: 'Klassisch',
  },
  lobby: {
    howToTitle: 'So geht’s',
    howTo:
      'Ziehe eines der drei Teile aufs Feld – oder tippe ein Teil und dann ein Feld an. Jede volle Reihe und Spalte verschwindet. Teile lassen sich nicht drehen.',
    howToScore:
      'Mehrere Linien auf einmal und Abräumen mit mehreren Teilen hintereinander (Combo) bringen Bonuspunkte. Das Spiel endet, wenn kein Teil mehr passt.',
    newGameDetail: '8×8-Feld, jeweils drei Teile',
    continue: 'Fortsetzen',
    continueDetail: '{score} Punkte',
    best: 'Rekord: {score}',
  },
  play: {
    best: 'Rekord',
    tray: 'Teile',
    piece: 'Teil {n}, {cells} {cells|Block|Blöcke}',
    piecePlaced: 'Teil {n}, bereits gelegt',
    board: 'Blocks-Spielfeld, 8 mal 8. Pfeiltasten bewegen, Enter legt das gewählte Teil.',
    combo: 'Combo ×{n}',
    lines: '{n} Linien!',
    boardCleared: 'Feld leer geräumt! +{bonus}',
    noSpace: 'Kein Teil passt mehr – Spielende.',
    keyboardHint: 'Tasten: 1–3 wählen ein Teil, Pfeile bewegen, Enter legt.',
  },
  pause: {
    title: 'Pause',
    newGame: 'Neues Spiel',
    confirmNew: 'Dieses Spiel beenden und ein neues starten?',
    quit: 'Zurück zum Menü',
  },
  result: {
    gameOver: 'Kein Platz mehr',
    lines: 'Linien abgeräumt',
    moves: 'Teile gelegt',
    playAgain: 'Nochmal spielen',
    menu: 'Menü',
  },
}
