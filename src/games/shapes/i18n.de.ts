import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Shapes',
  tagline: 'Tausche Früchte und bilde Reihen aus drei oder mehr.',
  seo: {
    about: 'Match-3 mit Obst- und Gartenmotiven: Tausche Nachbarn und bilde Reihen aus drei oder mehr. Zen, Zeit und Level mit Raketen und Dynamit.',
  },
  modes: {
    zen: 'Zen',
    time: 'Zeit',
    levels: 'Level',
  },
  modeInfo: {
    zen: 'Endlos und entspannt – kein Timer, kein Game Over.',
    time: '90 Sekunden. Spezialsteine und große Kettenreaktionen geben Bonuszeit.',
    levels: 'Erreiche die Ziele, bevor dir die Züge ausgehen. Jedes Level schaltet das nächste frei.',
  },
  lobby: {
    howTo:
      'Wische über einen Stein – oder tippe zwei Nachbarn an – um sie zu tauschen. Bilde Reihen aus drei oder mehr gleichen. Größere Reihen ergeben Raketen, Dynamit und Regenbogenkugeln.',
    howToTitle: 'So geht’s',
    howToLevels:
      'In den Leveln gibt es Hindernisse: Sprenge Ketten und Kisten, räume die markierten Felder ab und bringe die Fallgegenstände in die unterste Reihe – sie fallen nach unten, wenn die Steine darunter abgeräumt werden.',
    continue: 'Fortsetzen · {score} Punkte',
    continueLevel: 'Level {level} fortsetzen',
    level: 'Level {level}',
    best: 'Rekord: {score}',
  },
  hud: {
    score: 'Punkte',
    time: 'Zeit',
    moves: 'Züge',
    movesLeft: 'Züge übrig',
    goals: 'Ziele',
    level: 'Level {level}',
    bonusTime: '+{seconds} s',
  },
  goals: {
    score: '{target} Punkte erreichen',
    collect: '{count} × {shape} abräumen',
    specials: '{count} {count|Spezialstein|Spezialsteine} bilden',
    targets: 'Alle {count} markierten Felder abräumen',
    crates: 'Alle {count} Kisten zerstören',
    chains: 'Alle {count} angeketteten Steine befreien',
    items: '{count} {count|Gegenstand|Gegenstände} nach unten bringen',
    progress: '{current} von {target}',
    done: 'erledigt',
  },
  kinds: {
    k0: 'Erdbeeren',
    k1: 'Orangen',
    k2: 'Zitronen',
    k3: 'Blätter',
    k4: 'Blumen',
    k5: 'Trauben',
  },
  specials: {
    lineH: 'Reihen-Rakete',
    lineV: 'Spalten-Rakete',
    burst: 'Dynamit',
    prism: 'Regenbogenkugel',
  },
  rules: {
    specialsTitle: 'Sondersteine',
    obstaclesTitle: 'Hindernisse in Leveln',
    rocket: '4 in einer Reihe: räumt Reihe oder Spalte ab',
    bomb: 'L- oder T-Form: räumt die Umgebung ab',
    prism: '5 in einer Reihe: räumt eine Sorte ab',
    target: 'Beet: räume den Stein darauf ab',
    chain: 'Kette: bilde eine Reihe mit dem Stein',
    crate: 'Kiste: bilde daneben eine Reihe',
    item: 'Eichel: bringe sie in die unterste Reihe',
  },
  pause: {
    title: 'Pause',
    newGame: 'Neues Spiel',
    restartLevel: 'Level neu starten',
    endGame: 'Spiel beenden',
    quit: 'Zurück zum Menü',
  },
  result: {
    timeUp: 'Zeit abgelaufen!',
    zenEnded: 'Spiel beendet',
    levelComplete: 'Level geschafft!',
    levelFailed: 'Keine Züge mehr',
    levelFailedText: 'Nicht alle Ziele wurden erreicht.',
    moveBonus: 'Zug-Bonus',
    total: 'Gesamt',
    playAgain: 'Nochmal spielen',
    nextLevel: 'Nächstes Level',
    retry: 'Nochmal versuchen',
    menu: 'Menü',
  },
  settings: {
    idleHint: 'Hinweis bei Pause',
    idleHintInfo: 'Zeigt nach einigen Sekunden ohne Eingabe einen möglichen Zug.',
  },
  praise: {
    good: 'Gut!',
    great: 'Super!',
    amazing: 'Fantastisch!',
    incredible: 'Unglaublich!',
  },
  board: {
    label: 'Spielfeld mit 8 mal 8 Steinen. Pfeiltasten bewegen, Enter wählt einen Stein und tauscht ihn mit einem Nachbarn.',
    cell: 'Zeile {row}, Spalte {col}: {piece}',
    empty: 'leer',
    shuffled: 'Keine Züge mehr – neu gemischt!',
  },
}
