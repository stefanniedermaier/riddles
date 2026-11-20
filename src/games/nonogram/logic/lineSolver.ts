/**
 * Single-line solver: given a clue and the known cells of one line, returns the cells that
 * have the same value in every valid placement of the clue's blocks.
 *
 * Cells: -1 unknown, 0 empty, 1 filled. Dynamic programming over (blocks placed, position):
 * O(n · k) per line, no enumeration of placements.
 */

export type Known = -1 | 0 | 1

/**
 * Returns the line with every forced cell filled in, or `null` if the clue cannot be placed
 * consistently with the known cells (contradiction).
 */
export function solveLine(cells: readonly Known[], clue: readonly number[]): Known[] | null {
  const n = cells.length
  const k = clue.length

  // Prefix counts for O(1) range checks.
  const ones = new Int32Array(n + 1)
  const zeros = new Int32Array(n + 1)
  for (let i = 0; i < n; i++) {
    ones[i + 1] = ones[i]! + (cells[i] === 1 ? 1 : 0)
    zeros[i + 1] = zeros[i]! + (cells[i] === 0 ? 1 : 0)
  }
  const canFill = (a: number, b: number) => b <= n && zeros[b]! - zeros[a]! === 0
  const notFilled = (i: number) => cells[i] !== 1

  // fw[j * (n + 1) + i]: blocks 0..j-1 explain cells [0, i), and cell i may start something new.
  const W = n + 1
  const fw = new Uint8Array((k + 1) * W)
  fw[0] = 1
  for (let j = 0; j <= k; j++) {
    for (let i = 0; i <= n; i++) {
      if (!fw[j * W + i]) continue
      if (i < n && notFilled(i)) fw[j * W + i + 1] = 1
      if (j < k) {
        const end = i + clue[j]!
        if (!canFill(i, end)) continue
        if (end === n) fw[(j + 1) * W + n] = 1
        else if (notFilled(end)) fw[(j + 1) * W + end + 1] = 1
      }
    }
  }
  if (!fw[k * W + n]) return null

  // bw[j * W + i]: blocks j..k-1 explain cells [i, n).
  const bw = new Uint8Array((k + 1) * W)
  bw[k * W + n] = 1
  for (let j = k; j >= 0; j--) {
    for (let i = n; i >= 0; i--) {
      if (j === k && i === n) continue
      let ok = i < n && notFilled(i) && bw[j * W + i + 1] === 1
      if (!ok && j < k) {
        const end = i + clue[j]!
        if (canFill(i, end)) {
          if (end === n) ok = bw[(j + 1) * W + n] === 1
          else ok = notFilled(end) && bw[(j + 1) * W + end + 1] === 1
        }
      }
      if (ok) bw[j * W + i] = 1
    }
  }

  const canBeEmpty = new Uint8Array(n)
  const fillDiff = new Int32Array(n + 1)
  for (let j = 0; j <= k; j++) {
    for (let i = 0; i < n; i++) {
      if (!fw[j * W + i]) continue
      // Cell i empty, then the rest with blocks j.. from i + 1.
      if (notFilled(i) && bw[j * W + i + 1]) canBeEmpty[i] = 1
      // Block j starting at i.
      if (j < k) {
        const end = i + clue[j]!
        if (!canFill(i, end)) continue
        let ok: boolean
        if (end === n) ok = bw[(j + 1) * W + n] === 1
        else ok = notFilled(end) && bw[(j + 1) * W + end + 1] === 1
        if (!ok) continue
        fillDiff[i]! += 1
        fillDiff[end]! -= 1
        if (end < n) canBeEmpty[end] = 1 // the separator
      }
    }
  }

  const result: Known[] = new Array<Known>(n)
  let running = 0
  for (let i = 0; i < n; i++) {
    running += fillDiff[i]!
    const canFillCell = running > 0
    const canEmpty = canBeEmpty[i] === 1
    if (!canFillCell && !canEmpty) return null
    result[i] = canFillCell && canEmpty ? -1 : canFillCell ? 1 : 0
    if (cells[i] !== -1 && result[i] !== -1 && result[i] !== cells[i]) return null
    if (cells[i] !== -1) result[i] = cells[i]!
  }
  return result
}
