/**
 * Level tuning report (not part of the normal test run):
 *   SHAPES_TUNING=1 npx vitest run src/games/shapes/logic/__tests__/levels.tuning.test.ts
 */
import { writeFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getLevel } from '../levels'
import { botPlayLevel } from './bot'

const FROM = Number(process.env.SHAPES_FROM ?? 1)
const TO = Number(process.env.SHAPES_TO ?? 40)
const GAMES = Number(process.env.SHAPES_GAMES ?? 12)

describe.skipIf(!process.env.SHAPES_TUNING)('level tuning', () => {
  it.skipIf(!process.env.SHAPES_NEED)('measures moves needed per obstacle unit', () => {
    const lines: string[] = []
    for (let n = FROM; n <= TO; n++) {
      const def = getLevel(n)
      if (def.features.length !== 1) continue
      const used: number[] = []
      for (let g = 0; g < GAMES; g++) used.push(botPlayLevel(n, 2000 + g, 0.5, true).movesUsed)
      used.sort((a, b) => a - b)
      const goal = def.goals[0]!
      const units =
        def.features[0] === 'crates'
          ? def.layout.crates.reduce((s, hp) => s + hp, 0)
          : 'count' in goal
            ? goal.count
            : 1
      const median = used[Math.floor(used.length / 2)]!
      lines.push(`L${n} ${def.features[0]} units ${units} median ${median} per unit ${(median / units).toFixed(2)} p75 ${used[Math.floor(used.length * 0.75)]}`)
    }
    writeFileSync(process.env.SHAPES_OUT ?? 'shapes-tuning.txt', lines.join('\n') + '\n')
    expect(lines.length).toBeGreaterThan(0)
  }, 600_000)

  it.skipIf(!!process.env.SHAPES_NEED)('reports bot win rates per level', () => {
    const lines: string[] = []
    for (let n = FROM; n <= TO; n++) {
      const def = getLevel(n)
      let wins = 0
      let left = 0
      for (let g = 0; g < GAMES; g++) {
        const r = botPlayLevel(n, 1000 + g)
        if (r.won) {
          wins++
          left += r.movesLeft
        }
      }
      lines.push(
        `L${String(n).padStart(3)} ${def.features.join('+').padEnd(15) || 'classic'.padEnd(15)} ` +
          `moves ${String(def.moves).padStart(2)} win ${String(Math.round((wins / GAMES) * 100)).padStart(3)}% ` +
          `avg left ${wins ? (left / wins).toFixed(1) : '-'}  goals ${def.goals.map((g) => `${g.type}:${'count' in g ? g.count : g.target}`).join(' ')}`,
      )
    }
    writeFileSync(process.env.SHAPES_OUT ?? 'shapes-tuning.txt', lines.join('\n') + '\n')
    expect(lines.length).toBeGreaterThan(0)
  }, 600_000)
})
