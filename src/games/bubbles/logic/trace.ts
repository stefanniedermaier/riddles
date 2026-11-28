/**
 * The flight of a shot, computed analytically: a ray from the shooter that is reflected at the
 * side walls and stops at the ceiling or at the first bubble it touches. The aim line and the
 * shot itself both use `trace`, so a shot always lands where the aim line pointed.
 *
 * Bubbles collide a little "smaller" than they are drawn (`COLLIDE`), so a shot slips
 * through a gap that looks wide enough – as players expect. The landing cell is the free
 * cell nearest to the point of contact that holds on (ceiling row or next to a bubble).
 */
import { CELLS, COLS, centre, distance, isCell, neighbours, RADIUS, ROW_HEIGHT, ROWS, rowOf, SHOOTER_X, SHOOTER_Y, type Parity, type Point } from './grid'
import { EMPTY } from './types'

/** Centre distance at which a flying bubble touches one in the field. */
export const COLLIDE = 0.82
/** Allowed aim (degrees, 90 = straight up). */
export const MIN_ANGLE = 10
export const MAX_ANGLE = 170

const MAX_BOUNCES = 60

export interface Trace {
  /** Start, every wall bounce and the end point (centre of the flying bubble). */
  points: Point[]
  /** The cell the bubble snaps into, -1 when there is none (a completely full field). */
  cell: number
  /** The bubble that was hit, -1 for the ceiling. */
  hit: number
}

export const clampAngle = (angle: number): number => Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angle))

/** The aim angle from the shooter towards a point (clamped). */
export function angleTowards(point: Point): number {
  const dx = point.x - SHOOTER_X
  const dy = SHOOTER_Y - point.y
  // Pointing below the shooter: aim along the closer side.
  if (dy <= 0) return dx < 0 ? MAX_ANGLE : MIN_ANGLE
  return clampAngle((Math.atan2(dy, dx) * 180) / Math.PI)
}

/** Smallest t ≥ 0 at which `pos + t·dir` is `COLLIDE` away from `c` (dir is a unit vector). */
function hitTime(pos: Point, dir: Point, c: Point): number {
  const fx = pos.x - c.x
  const fy = pos.y - c.y
  const b = fx * dir.x + fy * dir.y
  const k = fx * fx + fy * fy - COLLIDE * COLLIDE
  if (k <= 0) return 0
  if (b >= 0) return Infinity
  const disc = b * b - k
  if (disc < 0) return Infinity
  return -b - Math.sqrt(disc)
}

/** Can a bubble hold on in this free cell (ceiling row or next to another bubble)? */
function holds(cells: readonly number[], parity: Parity, cell: number): boolean {
  if (rowOf(cell) === 0) return true
  return neighbours(cell, parity).some((n) => cells[n] !== EMPTY)
}

/** The free cell that holds on nearest to `point` (only cells close to it are looked at). */
export function landingCell(cells: readonly number[], parity: Parity, point: Point): number {
  let best = -1
  let bestDistance = Infinity
  const around = Math.floor((point.y - RADIUS) / ROW_HEIGHT)
  for (const radius of [1, ROWS]) {
    for (let row = Math.max(0, around - radius); row <= Math.min(ROWS - 1, around + radius + 1); row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = row * COLS + col
        if (!isCell(cell, parity) || cells[cell] !== EMPTY) continue
        const d = distance(centre(cell, parity), point)
        if (d < bestDistance - 1e-9 && holds(cells, parity, cell)) {
          bestDistance = d
          best = cell
        }
      }
    }
    // Close cells are always enough, except on an (almost) full field.
    if (best >= 0) break
  }
  return best
}

export function trace(cells: readonly number[], parity: Parity, angle: number): Trace {
  const radians = (clampAngle(angle) * Math.PI) / 180
  const dir = { x: Math.cos(radians), y: -Math.sin(radians) }
  let pos: Point = { x: SHOOTER_X, y: SHOOTER_Y }
  const points: Point[] = [pos]
  const occupied: { cell: number; c: Point }[] = []
  for (let cell = 0; cell < CELLS; cell++) {
    if (cells[cell] !== EMPTY && isCell(cell, parity)) occupied.push({ cell, c: centre(cell, parity) })
  }
  const left = RADIUS
  const right = COLS - RADIUS

  for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
    const tWall = dir.x > 1e-12 ? (right - pos.x) / dir.x : dir.x < -1e-12 ? (left - pos.x) / dir.x : Infinity
    const tCeiling = (pos.y - RADIUS) / -dir.y
    let tHit = Infinity
    let hit = -1
    for (const { cell, c } of occupied) {
      const t = hitTime(pos, dir, c)
      if (t < tHit) {
        tHit = t
        hit = cell
      }
    }
    const t = Math.min(tWall, tCeiling, tHit)
    const end = { x: pos.x + dir.x * t, y: pos.y + dir.y * t }
    if (t === tHit || t === tCeiling) {
      const stop = t === tHit ? hit : -1
      points.push(end)
      return { points, cell: landingCell(cells, parity, end), hit: stop }
    }
    // Wall: reflect.
    end.x = dir.x > 0 ? right : left
    points.push(end)
    pos = end
    dir.x = -dir.x
  }
  // Practically unreachable (angles are at least 10° off the horizontal).
  const end = points[points.length - 1]!
  return { points, cell: landingCell(cells, parity, end), hit: -1 }
}
