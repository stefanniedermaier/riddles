/**
 * Human-style solving techniques. Each finder looks for exactly one step on a candidate
 * grid and returns it (or `null`). The grader applies the simplest available step until the
 * puzzle is solved; hints use the same steps to explain the next deduction.
 */
import {
  combinations,
  digitsOf,
  geometryOfCells,
  popcount,
  singleDigit,
  unitCells,
  type Geometry,
} from './board'
import type { CellDigit, Step, TechniqueId, Unit } from './types'

export interface LogicState {
  values: number[]
  /** Candidate bitmask per cell (0 for filled cells). */
  cands: Uint16Array
  /** Grid geometry; derived from the number of cells when omitted. */
  geo?: Geometry
}

const geoOf = (state: LogicState): Geometry => (state.geo ??= geometryOfCells(state.values.length))

/** Builds the candidate grid for the given values; `null` if the values contradict. */
export function createLogicState(values: readonly number[]): LogicState | null {
  const geo = geometryOfCells(values.length)
  const state: LogicState = { values: Array.from(values), cands: new Uint16Array(geo.cellCount), geo }
  for (let cell = 0; cell < geo.cellCount; cell++) {
    const digit = state.values[cell]!
    if (digit === 0) continue
    for (const peer of geo.peers[cell]!) if (state.values[peer] === digit) return null
  }
  for (let cell = 0; cell < geo.cellCount; cell++) {
    if (state.values[cell] !== 0) continue
    let mask = geo.allDigits
    for (const peer of geo.peers[cell]!) mask &= ~(1 << state.values[peer]!)
    state.cands[cell] = mask
  }
  return state
}

function placeDigit(state: LogicState, cell: number, digit: number): void {
  state.values[cell] = digit
  state.cands[cell] = 0
  const bit = ~(1 << digit)
  for (const peer of geoOf(state).peers[cell]!) state.cands[peer]! &= bit
}

export function applyStep(state: LogicState, step: Step): void {
  for (const { cell, digit } of step.eliminations) state.cands[cell]! &= ~(1 << digit)
  for (const { cell, digit } of step.placements) placeDigit(state, cell, digit)
}

export function isComplete(state: LogicState): boolean {
  return state.values.every((d) => d !== 0)
}

// ---------------------------------------------------------------------------

const rowUnit = (index: number): Unit => ({ kind: 'row', index })
const colUnit = (index: number): Unit => ({ kind: 'col', index })
const boxUnit = (index: number): Unit => ({ kind: 'box', index })

function makeStep(technique: TechniqueId, data: Partial<Step>): Step {
  return {
    technique,
    placements: [],
    eliminations: [],
    focusCells: [],
    digits: [],
    units: [],
    coverUnits: [],
    ...data,
  }
}

function digitPlacedIn(state: LogicState, cells: readonly number[], digit: number): boolean {
  for (const cell of cells) if (state.values[cell] === digit) return true
  return false
}

function positionsOf(state: LogicState, cells: readonly number[], digit: number): number[] {
  const bit = 1 << digit
  const result: number[] = []
  for (const cell of cells) if (state.cands[cell]! & bit) result.push(cell)
  return result
}

// --- Level 1 ---------------------------------------------------------------

export function findNakedSingle(state: LogicState): Step | null {
  const geo = geoOf(state)
  for (let cell = 0; cell < geo.cellCount; cell++) {
    if (state.values[cell] !== 0) continue
    const mask = state.cands[cell]!
    if (popcount(mask) !== 1) continue
    const digit = singleDigit(mask)
    return makeStep('nakedSingle', {
      placements: [{ cell, digit }],
      focusCells: [cell],
      digits: [digit],
      units: [rowUnit(geo.rowOf[cell]!), colUnit(geo.colOf[cell]!), boxUnit(geo.boxOf[cell]!)],
    })
  }
  return null
}

export function findHiddenSingle(state: LogicState): Step | null {
  const geo = geoOf(state)
  for (const unit of geo.allUnits) {
    const cells = unitCells(unit, geo)
    for (const digit of geo.digits) {
      if (digitPlacedIn(state, cells, digit)) continue
      const positions = positionsOf(state, cells, digit)
      if (positions.length !== 1) continue
      const cell = positions[0]!
      return makeStep('hiddenSingle', {
        placements: [{ cell, digit }],
        focusCells: [cell],
        digits: [digit],
        units: [unit],
      })
    }
  }
  return null
}

// --- Level 2 ---------------------------------------------------------------

/** Candidates of a digit inside a box all lie on one line → remove from the rest of the line. */
export function findPointing(state: LogicState): Step | null {
  const geo = geoOf(state)
  const { rowOf, colOf, boxOf } = geo
  for (let box = 0; box < geo.size; box++) {
    const boxCells = geo.boxes[box]!
    for (const digit of geo.digits) {
      if (digitPlacedIn(state, boxCells, digit)) continue
      const positions = positionsOf(state, boxCells, digit)
      if (positions.length < 2) continue
      const lines: [Unit, readonly number[]][] = []
      const row = rowOf[positions[0]!]!
      if (positions.every((cell) => rowOf[cell] === row)) lines.push([rowUnit(row), geo.rows[row]!])
      const col = colOf[positions[0]!]!
      if (positions.every((cell) => colOf[cell] === col)) lines.push([colUnit(col), geo.cols[col]!])
      for (const [line, lineCells] of lines) {
        const eliminations = positionsOf(state, lineCells, digit)
          .filter((cell) => boxOf[cell] !== box)
          .map((cell) => ({ cell, digit }))
        if (eliminations.length > 0) {
          return makeStep('pointing', {
            eliminations,
            focusCells: positions,
            digits: [digit],
            units: [boxUnit(box)],
            coverUnits: [line],
          })
        }
      }
    }
  }
  return null
}

/** Candidates of a digit on a line all lie in one box → remove from the rest of the box. */
export function findClaiming(state: LogicState): Step | null {
  const geo = geoOf(state)
  const { boxOf } = geo
  const lines: [Unit, readonly number[]][] = [
    ...geo.rows.map((cells, i): [Unit, readonly number[]] => [rowUnit(i), cells]),
    ...geo.cols.map((cells, i): [Unit, readonly number[]] => [colUnit(i), cells]),
  ]
  for (const [line, lineCells] of lines) {
    for (const digit of geo.digits) {
      if (digitPlacedIn(state, lineCells, digit)) continue
      const positions = positionsOf(state, lineCells, digit)
      if (positions.length < 2) continue
      const box = boxOf[positions[0]!]!
      if (!positions.every((cell) => boxOf[cell] === box)) continue
      const onLine = new Set(lineCells)
      const eliminations = positionsOf(state, geo.boxes[box]!, digit)
        .filter((cell) => !onLine.has(cell))
        .map((cell) => ({ cell, digit }))
      if (eliminations.length > 0) {
        return makeStep('claiming', {
          eliminations,
          focusCells: positions,
          digits: [digit],
          units: [line],
          coverUnits: [boxUnit(box)],
        })
      }
    }
  }
  return null
}

// --- Level 3 ---------------------------------------------------------------

function findNakedSubset(state: LogicState, size: number, technique: TechniqueId): Step | null {
  const geo = geoOf(state)
  for (const unit of geo.allUnits) {
    const cells = unitCells(unit, geo)
    const candidates = cells.filter((cell) => {
      if (state.values[cell] !== 0) return false
      const count = popcount(state.cands[cell]!)
      return count >= 2 && count <= size
    })
    if (candidates.length < size) continue
    for (const subset of combinations(candidates, size)) {
      let union = 0
      for (const cell of subset) union |= state.cands[cell]!
      if (popcount(union) !== size) continue
      const eliminations: CellDigit[] = []
      for (const cell of cells) {
        if (state.values[cell] !== 0 || subset.includes(cell)) continue
        const overlap = state.cands[cell]! & union
        for (const digit of digitsOf(overlap)) eliminations.push({ cell, digit })
      }
      if (eliminations.length > 0) {
        return makeStep(technique, {
          eliminations,
          focusCells: subset,
          digits: digitsOf(union),
          units: [unit],
        })
      }
    }
  }
  return null
}

function findHiddenSubset(state: LogicState, size: number, technique: TechniqueId): Step | null {
  const geo = geoOf(state)
  for (const unit of geo.allUnits) {
    const cells = unitCells(unit, geo)
    // positions[d] = bitmask over the unit's cell slots
    const digitPositions = new Map<number, number>()
    for (const digit of geo.digits) {
      if (digitPlacedIn(state, cells, digit)) continue
      let mask = 0
      cells.forEach((cell, slot) => {
        if (state.cands[cell]! & (1 << digit)) mask |= 1 << slot
      })
      const count = popcount(mask)
      if (count >= 2 && count <= size) digitPositions.set(digit, mask)
    }
    if (digitPositions.size < size) continue
    for (const digits of combinations([...digitPositions.keys()], size)) {
      let union = 0
      for (const digit of digits) union |= digitPositions.get(digit)!
      if (popcount(union) !== size) continue
      const subsetCells = cells.filter((_, slot) => union & (1 << slot))
      let keep = 0
      for (const digit of digits) keep |= 1 << digit
      const eliminations: CellDigit[] = []
      for (const cell of subsetCells) {
        for (const digit of digitsOf(state.cands[cell]! & ~keep)) eliminations.push({ cell, digit })
      }
      if (eliminations.length > 0) {
        return makeStep(technique, {
          eliminations,
          focusCells: subsetCells,
          digits,
          units: [unit],
        })
      }
    }
  }
  return null
}

export const findNakedPair = (s: LogicState): Step | null => findNakedSubset(s, 2, 'nakedPair')
export const findNakedTriple = (s: LogicState): Step | null => findNakedSubset(s, 3, 'nakedTriple')
export const findHiddenPair = (s: LogicState): Step | null => findHiddenSubset(s, 2, 'hiddenPair')
export const findHiddenTriple = (s: LogicState): Step | null =>
  findHiddenSubset(s, 3, 'hiddenTriple')

// --- Level 4 ---------------------------------------------------------------

function findFish(state: LogicState, size: number, technique: TechniqueId): Step | null {
  const geo = geoOf(state)
  const rowOf = (cell: number): number => geo.rowOf[cell]!
  const colOf = (cell: number): number => geo.colOf[cell]!
  for (const digit of geo.digits) {
    const bit = 1 << digit
    for (const orientation of ['row', 'col'] as const) {
      const baseLines = orientation === 'row' ? geo.rows : geo.cols
      const coverLines = orientation === 'row' ? geo.cols : geo.rows
      const crossIndex = orientation === 'row' ? colOf : rowOf

      // For every base line: bitmask of cross indices holding the candidate.
      const bases: { index: number; mask: number }[] = []
      baseLines.forEach((cells, index) => {
        if (digitPlacedIn(state, cells, digit)) return
        let mask = 0
        for (const cell of cells) if (state.cands[cell]! & bit) mask |= 1 << crossIndex(cell)
        const count = popcount(mask)
        if (count >= 2 && count <= size) bases.push({ index, mask })
      })
      if (bases.length < size) continue

      for (const combo of combinations(bases, size)) {
        let cover = 0
        for (const base of combo) cover |= base.mask
        if (popcount(cover) !== size) continue
        const baseIndices = new Set(combo.map((base) => base.index))
        const coverIndices = geo.digits.map((d) => d - 1).filter((i) => cover & (1 << i))
        const eliminations: CellDigit[] = []
        for (const coverIndex of coverIndices) {
          for (const cell of coverLines[coverIndex]!) {
            const baseIndex = orientation === 'row' ? rowOf(cell) : colOf(cell)
            if (!baseIndices.has(baseIndex) && state.cands[cell]! & bit) {
              eliminations.push({ cell, digit })
            }
          }
        }
        if (eliminations.length === 0) continue
        const focusCells: number[] = []
        for (const base of combo) {
          for (const cell of baseLines[base.index]!) if (state.cands[cell]! & bit) focusCells.push(cell)
        }
        const toUnit = orientation === 'row' ? rowUnit : colUnit
        const toCover = orientation === 'row' ? colUnit : rowUnit
        return makeStep(technique, {
          eliminations,
          focusCells,
          digits: [digit],
          units: combo.map((base) => toUnit(base.index)),
          coverUnits: coverIndices.map(toCover),
        })
      }
    }
  }
  return null
}

export const findXWing = (s: LogicState): Step | null => findFish(s, 2, 'xWing')
export const findSwordfish = (s: LogicState): Step | null => findFish(s, 3, 'swordfish')

/**
 * XY-Wing: pivot {a,b}, pincer1 {a,c} and pincer2 {b,c}, both seeing the pivot.
 * Whatever the pivot is, one pincer becomes c → c is removed from cells seeing both pincers.
 */
export function findXYWing(state: LogicState): Step | null {
  const geo = geoOf(state)
  const { isPeer: IS_PEER, peers: PEERS } = geo
  const bivalue: number[] = []
  for (let cell = 0; cell < geo.cellCount; cell++) {
    if (state.values[cell] === 0 && popcount(state.cands[cell]!) === 2) bivalue.push(cell)
  }
  for (const pivot of bivalue) {
    const pivotMask = state.cands[pivot]!
    const pincers = bivalue.filter((cell) => IS_PEER[pivot]![cell])
    for (const p1 of pincers) {
      const m1 = state.cands[p1]!
      const shared1 = m1 & pivotMask
      if (popcount(shared1) !== 1) continue
      const cBit = m1 & ~pivotMask
      const otherBit = pivotMask & ~shared1
      const p2Mask = otherBit | cBit
      for (const p2 of pincers) {
        if (p2 === p1 || state.cands[p2] !== p2Mask) continue
        const c = singleDigit(cBit)
        const eliminations: CellDigit[] = []
        for (const cell of PEERS[p1]!) {
          if (cell !== p2 && cell !== pivot && IS_PEER[p2]![cell] && state.cands[cell]! & cBit) {
            eliminations.push({ cell, digit: c })
          }
        }
        if (eliminations.length > 0) {
          return makeStep('xyWing', {
            eliminations,
            focusCells: [pivot, p1, p2],
            digits: [singleDigit(shared1), singleDigit(otherBit), c],
          })
        }
      }
    }
  }
  return null
}
