/** Geometry helpers: cells of rows/columns and clues of lines. */

type LineKind = 'row' | 'col'

export interface LineRef {
  kind: LineKind
  index: number
}

/** Cell indices (row-major) of a row or column. */
export function lineCells(width: number, height: number, line: LineRef): number[] {
  if (line.kind === 'row') return Array.from({ length: width }, (_, c) => line.index * width + c)
  return Array.from({ length: height }, (_, r) => r * width + line.index)
}

/** Lengths of the consecutive runs of `1` in a line – its clue (empty for an empty line). */
export function runsOf(values: readonly number[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const v of values) {
    if (v === 1) run++
    else if (run > 0) {
      runs.push(run)
      run = 0
    }
  }
  if (run > 0) runs.push(run)
  return runs
}

export function cluesFor(
  solution: readonly number[],
  width: number,
  height: number,
): { rowClues: number[][]; colClues: number[][] } {
  const rowClues = Array.from({ length: height }, (_, r) =>
    runsOf(lineCells(width, height, { kind: 'row', index: r }).map((cell) => solution[cell]!)),
  )
  const colClues = Array.from({ length: width }, (_, c) =>
    runsOf(lineCells(width, height, { kind: 'col', index: c }).map((cell) => solution[cell]!)),
  )
  return { rowClues, colClues }
}

export function sameClue(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i])
}
