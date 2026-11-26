import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Water Sort',
  tagline: 'Gieße das Wasser von Glas zu Glas, bis jedes Glas nur eine Farbe enthält.',
  seo: {
    about: 'Wasser-Sortier-Rätsel: Gieße farbiges Wasser um, bis jedes Röhrchen nur eine Farbe enthält. 4 bis 12 Farben, immer lösbar, unbegrenzt zurück.',
  },
  sizeLabel: '{colors} Farben',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Sortiere das Wasser: Am Ende ist jedes Glas mit einer Farbe gefüllt oder leer.',
    pour: 'Tippe ein Glas an, um es aufzunehmen, und dann ein anderes Glas, um umzugießen.',
    allowed: 'Wasser darf nur auf dieselbe Farbe oder in ein leeres Glas gegossen werden – so viel hineinpasst.',
    undo: 'Festgefahren? Nimm beliebig viele Züge zurück.',
  },
  play: {
    moves: 'Züge',
    sorted: 'Sortiert',
    undo: 'Rückgängig',
    restart: 'Neu starten',
    restartConfirm: 'Dieses Level noch einmal von vorn beginnen?',
    toMenu: 'Water-Sort-Menü',
    rules: 'Regeln',
    tubes: 'Gläser',
    tube: 'Glas {n}',
    empty: 'leer',
    selected: 'aufgenommen',
    layers: 'von unten nach oben: {list}',
    notAllowed: 'In dieses Glas passt das Wasser nicht.',
    hint: 'Hinweis',
    hintMove: 'Gieße Glas {from} in Glas {to}.',
    deadEnd: 'Von hier gibt es keinen Ausweg – nimm ein paar Züge zurück.',
  },
  colors: {
    c0: 'rot',
    c1: 'blau',
    c2: 'grün',
    c3: 'gelb',
    c4: 'orange',
    c5: 'lila',
    c6: 'türkis',
    c7: 'rosa',
    c8: 'schwarz',
    c9: 'braun',
    c10: 'grau',
    c11: 'hellgrün',
  },
  result: {
    solvedText: 'Jede Farbe hat ihr eigenes Glas.',
  },
  settings: {
    showSymbols: 'Symbole zeigen',
    showSymbolsDesc: 'Ein Buchstabe auf jeder Schicht hilft, wenn Farben schwer zu unterscheiden sind.',
  },
}
