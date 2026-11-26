/**
 * Shared SVG gradients and clip paths for the Shapes pieces.
 *
 * Gradients are defined once in a hidden `<svg>` in the document body and referenced by id
 * (`url(#sp-…)`) from every piece. That keeps the 64 pieces on the board small (no `<defs>`
 * per piece, no duplicate ids) while giving them a glossy, three-dimensional look.
 *
 * See `core/svgDefs.ts`.
 */
import { ensureSvgDefs } from '@/core/svgDefs'

const DEFS_ID = 'shape-piece-defs'

/** Radial "sphere" gradient: light spot top left, main colour, dark rim. */
function sphere(id: string, light: string, main: string, dark: string): string {
  return `<radialGradient id="${id}" cx="0.36" cy="0.3" r="0.78" fx="0.3" fy="0.24">
    <stop offset="0" stop-color="${light}"/>
    <stop offset="0.5" stop-color="${main}"/>
    <stop offset="1" stop-color="${dark}"/>
  </radialGradient>`
}

/** Vertical linear gradient (top → bottom). */
function vertical(id: string, ...stops: [number, string, number?][]): string {
  const list = stops
    .map(([offset, color, opacity]) =>
      opacity === undefined
        ? `<stop offset="${offset}" stop-color="${color}"/>`
        : `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`,
    )
    .join('')
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${list}</linearGradient>`
}

/** Outline of a rocket's hull (nose to the right); the fruit texture is clipped to it. */
export const ROCKET_HULL = 'M18 33H60Q86 33 98 50Q86 67 60 67H18Q12 50 18 33Z'

/** The three sticks of a dynamite bundle (the middle one in front and a little higher). */
export const DYNAMITE_STICKS = [
  { x: 16, y: 36, h: 56 },
  { x: 62, y: 36, h: 56 },
  { x: 39, y: 30, h: 62 },
] as const

const stickRects = DYNAMITE_STICKS.map(
  ({ x, y, h }) => `<rect x="${x}" y="${y}" width="22" height="${h}" rx="5"/>`,
).join('')

const DEFS = [
  sphere('sp-red', '#ff9aa6', '#f2263f', '#a30c22'),
  sphere('sp-orange', '#ffe0a0', '#ff9412', '#c75600'),
  sphere('sp-yellow', '#fffbd0', '#ffd61f', '#d19a00'),
  sphere('sp-green', '#b8f58a', '#2fbd4f', '#0f7a2c'),
  sphere('sp-blue', '#c4dcff', '#3584ff', '#1646b8'),
  sphere('sp-purple', '#e7c4ff', '#a24bf5', '#5a12a8'),
  sphere('sp-gold', '#fff6b0', '#ffc21a', '#d97a00'),
  sphere('sp-leaf', '#a6ef7c', '#3cb850', '#167a30'),
  sphere('sp-acorn', '#ffd29a', '#d18a42', '#83501d'),
  sphere('sp-cap', '#a77748', '#6e4320', '#3e2410'),
  vertical('sp-gloss', [0, '#ffffff', 0.95], [1, '#ffffff', 0]),
  `<radialGradient id="sp-orb" cx="0.35" cy="0.28" r="0.7">
    <stop offset="0" stop-color="#fff" stop-opacity="0.85"/>
    <stop offset="0.45" stop-color="#fff" stop-opacity="0.15"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
  </radialGradient>`,
  // Clip paths in the user space of the piece that uses them (rotates with a column rocket).
  `<clipPath id="sp-clip-rocket"><path d="${ROCKET_HULL}"/></clipPath>`,
  `<clipPath id="sp-clip-dynamite">${stickRects}</clipPath>`,
].join('')

/** Adds the gradient definitions to the document once. */
export function ensurePieceDefs(): void {
  ensureSvgDefs(DEFS_ID, DEFS)
}
