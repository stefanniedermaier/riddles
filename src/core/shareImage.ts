/**
 * Renders the image that is shared with a result ("Share result" in the win dialog):
 * a 1080 × 1080 card in the game's colour with the golden trophy on rays at the top, the
 * title, a white panel with the game logo, name, difficulty and the result, an optional
 * "personal best" badge and the app's address at the bottom.
 *
 * Drawn on a canvas, so it works offline and needs no server. The game logo is an inline
 * SVG from the page (see {@link svgToImage}); everything else is drawn here.
 */
import { icons } from '@/components/icons'

export interface ResultCard {
  title: string
  game: string
  variant: string
  /** "Time" / "Score". */
  resultLabel?: string
  result?: string
  /** Text of the badge, only when it was a personal best. */
  badge?: string
  /** Game colour as a CSS colour (resolved, e.g. `rgb(58, 114, 214)`). */
  accent: string
  logo: HTMLImageElement | null
  /** Footer, e.g. "Riddles · example.org/riddles". */
  footer: string
  fontFamily: string
}

const SIZE = 1080

/** Relative luminance of a `#rrggbb` colour (canvas normalises fill styles to that form). */
function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Turns an inline SVG of the page into an image. CSS variables in its attributes would not
 * resolve in a standalone image, so the computed colours and fonts are copied onto a clone.
 */
export function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const source = [svg, ...svg.querySelectorAll('*')] as Element[]
  const target = [clone, ...clone.querySelectorAll('*')] as Element[]
  source.forEach((el, i) => {
    const style = getComputedStyle(el)
    const out = target[i]!
    const tag = el.tagName.toLowerCase()
    if (tag === 'stop') {
      out.setAttribute('stop-color', style.stopColor)
      out.setAttribute('stop-opacity', style.stopOpacity)
      return
    }
    for (const prop of ['fill', 'stroke'] as const) {
      const value = style[prop]
      if (value && !value.startsWith('url(')) out.setAttribute(prop, value)
    }
    if (tag === 'text') out.setAttribute('font-family', style.fontFamily)
    out.removeAttribute('class')
  })
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', '256')
  clone.setAttribute('height', '256')
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

/** Writes text, shrinking the font until it fits `maxWidth`. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  weight: number,
  size: number,
  family: string,
): void {
  let px = size
  do {
    ctx.font = `${weight} ${px}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
    px -= 2
  } while (px > 12)
  ctx.fillText(text, x, y)
}

function drawTrophy(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Rays.
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = 'rgba(255, 236, 150, 0.28)'
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, 300, a, a + Math.PI / 28)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // Medallion: gold outer ring, white ring, golden disc.
  const r = 112
  ctx.beginPath()
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2)
  ctx.fillStyle = '#e3a000'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  const disc = ctx.createRadialGradient(cx - 35, cy - 40, 10, cx, cy, r)
  disc.addColorStop(0, '#fff6b0')
  disc.addColorStop(0.55, '#ffc21a')
  disc.addColorStop(1, '#e08a00')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = disc
  ctx.fill()

  // The trophy icon (24 × 24 paths) in white.
  ctx.save()
  const scale = 5.4
  ctx.translate(cx - 12 * scale, cy - 12.5 * scale)
  ctx.scale(scale, scale)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(120, 60, 0, 0.45)'
  ctx.shadowOffsetY = 0.5
  for (const path of icons.trophy) ctx.stroke(new Path2D(path.d))
  ctx.restore()
}

export function renderResultCard(card: ResultCard): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  const family = card.fontFamily || 'system-ui, sans-serif'

  // Background in the game colour, lighter on top, darker below, with a dot motif.
  ctx.fillStyle = card.accent
  ctx.fillRect(0, 0, SIZE, SIZE)
  // Game colours are light in dark mode: darken them so the white text keeps its contrast.
  if (luminance(String(ctx.fillStyle)) > 0.3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'
    ctx.fillRect(0, 0, SIZE, SIZE)
  }
  const shade = ctx.createLinearGradient(0, 0, 0, SIZE)
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.22)')
  shade.addColorStop(0.45, 'rgba(255, 255, 255, 0)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.32)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  for (let y = 24; y < SIZE; y += 48) {
    for (let x = 24; x < SIZE; x += 48) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawTrophy(ctx, SIZE / 2, 230)

  // Title.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowOffsetY = 4
  fitText(ctx, card.title, SIZE / 2, 470, 900, 900, 84, family)
  ctx.shadowColor = 'transparent'

  // White panel (square, Material elevation).
  const panel = { x: 90, y: 520, w: 900, h: 430 }
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 8
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  // Coloured edge on the left, like the mode cards.
  ctx.fillStyle = card.accent
  ctx.fillRect(panel.x, panel.y, 14, panel.h)

  // Logo, game name and difficulty.
  if (card.logo) ctx.drawImage(card.logo, panel.x + 50, panel.y + 40, 170, 170)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1d1b26'
  fitText(ctx, card.game, panel.x + 250, panel.y + 115, panel.w - 290, 900, 64, family)
  ctx.fillStyle = '#636070'
  fitText(ctx, card.variant, panel.x + 250, panel.y + 172, panel.w - 290, 600, 40, family)

  // Divider and result.
  ctx.fillStyle = '#e4e1ea'
  ctx.fillRect(panel.x + 50, panel.y + 245, panel.w - 100, 3)
  if (card.result) {
    ctx.fillStyle = '#636070'
    fitText(ctx, card.resultLabel ?? '', panel.x + 50, panel.y + 310, 400, 700, 36, family)
    ctx.fillStyle = '#1d1b26'
    fitText(ctx, card.result, panel.x + 50, panel.y + 400, 420, 900, 104, family)
  }

  // Personal best badge (square, gold).
  if (card.badge) {
    ctx.font = `800 34px ${family}`
    const width = Math.min(430, ctx.measureText(card.badge).width + 60)
    const bx = panel.x + panel.w - 50 - width
    const by = panel.y + 330
    const gold = ctx.createLinearGradient(0, by, 0, by + 70)
    gold.addColorStop(0, '#ffe27a')
    gold.addColorStop(1, '#f3a300')
    ctx.fillStyle = gold
    ctx.fillRect(bx, by, width, 70)
    ctx.fillStyle = '#5a3000'
    ctx.textAlign = 'center'
    fitText(ctx, card.badge, bx + width / 2, by + 47, width - 30, 800, 34, family)
  }

  // Footer.
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  fitText(ctx, card.footer, SIZE / 2, 1030, 960, 700, 34, family)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
