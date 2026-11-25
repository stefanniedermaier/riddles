import { ensureSvgDefs } from '@/core/svgDefs'

/** Gradients shared by all game logos (defined once per page, see `ensureLogoDefs`). */
export const LOGO_GRADIENTS = [
  'glaze',
  'gold',
  'meadow',
  'bomb',
  'liquid',
  'peg',
  'bevel',
  'red',
  'orange',
  'green',
  'purple',
  'leaf',
] as const

/** Clip paths a logo defines itself (unique per logo instance). */
export const LOGO_CLIPS = ['tube1', 'tube2', 'tube3'] as const

export type LogoIds = Record<(typeof LOGO_GRADIENTS)[number] | (typeof LOGO_CLIPS)[number], string>

/** Fixed ids of the shared gradients. */
export const LOGO_GRADIENT_IDS = Object.fromEntries(
  LOGO_GRADIENTS.map((name) => [name, `art-${name}`]),
) as Record<(typeof LOGO_GRADIENTS)[number], string>

const DEFS = `<linearGradient id="art-glaze" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity=".45" />
<stop offset="1" stop-color="#fff" stop-opacity="0" />
</linearGradient>
<radialGradient id="art-gold" cx=".4" cy=".3" r=".8">
<stop offset="0" stop-color="#fff6b0" /><stop offset=".5" stop-color="#ffc21a" /><stop offset="1" stop-color="#d97a00" />
</radialGradient>
<linearGradient id="art-meadow" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#74c95f" /><stop offset=".55" stop-color="#3f8f33" /><stop offset="1" stop-color="#2f7428" />
</linearGradient>
<radialGradient id="art-bomb" cx=".36" cy=".3" r=".78">
<stop offset="0" stop-color="#8d96ab" /><stop offset=".5" stop-color="#2d3242" /><stop offset="1" stop-color="#0b0d14" />
</radialGradient>
<linearGradient id="art-liquid" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
<stop offset="0" stop-color="#000" stop-opacity=".2" /><stop offset=".4" stop-color="#fff" stop-opacity=".25" /><stop offset="1" stop-color="#000" stop-opacity=".2" />
</linearGradient>
<linearGradient id="art-bevel" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity=".45" /><stop offset=".45" stop-color="#fff" stop-opacity="0" />
<stop offset=".7" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".28" />
</linearGradient>
<radialGradient id="art-red" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#ff9aa6" /><stop offset=".5" stop-color="#f2263f" /><stop offset="1" stop-color="#a30c22" /></radialGradient>
<radialGradient id="art-orange" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#ffe0a0" /><stop offset=".5" stop-color="#ff9412" /><stop offset="1" stop-color="#c75600" /></radialGradient>
<radialGradient id="art-green" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#b8f58a" /><stop offset=".5" stop-color="#2fbd4f" /><stop offset="1" stop-color="#0f7a2c" /></radialGradient>
<radialGradient id="art-purple" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#e7c4ff" /><stop offset=".5" stop-color="#a24bf5" /><stop offset="1" stop-color="#5a12a8" /></radialGradient>
<radialGradient id="art-leaf" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#a6ef7c" /><stop offset=".5" stop-color="#3cb850" /><stop offset="1" stop-color="#167a30" /></radialGradient>
<radialGradient id="art-peg" cx=".35" cy=".3" r=".75">
<stop offset="0" stop-color="#fff" stop-opacity=".75" /><stop offset=".45" stop-color="#fff" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".25" />
</radialGradient>`

export function ensureLogoDefs(): void {
  ensureSvgDefs('game-art-defs', DEFS)
}
