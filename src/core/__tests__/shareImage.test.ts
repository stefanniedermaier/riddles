import { afterEach, describe, expect, it, vi } from 'vitest'

import { svgToImage } from '../shareImage'
import { ensureSvgDefs } from '../svgDefs'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Image stand-in: loads at once and keeps the data URL it was given. */
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  #src = ''
  get src(): string {
    return this.#src
  }
  set src(value: string) {
    this.#src = value
    queueMicrotask(() => this.onload?.())
  }
}

describe('svgToImage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('turns an svg into a standalone image that carries the shared gradients it uses', async () => {
    vi.stubGlobal('Image', FakeImage)
    ensureSvgDefs('test-defs', '<linearGradient id="g-used"/><linearGradient id="g-unused"/>')
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.innerHTML = '<rect class="x" width="4" height="4" fill="url(#g-used)"/>'
    document.body.append(svg)

    const image = (await svgToImage(svg)) as unknown as FakeImage
    const markup = decodeURIComponent(image.src.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''))
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(markup).toContain('width="256"')
    expect(markup).toContain('<linearGradient id="g-used"')
    expect(markup).not.toContain('g-unused')
    expect(markup).not.toContain('class=')
    // The page's svg itself is left alone.
    expect(svg.querySelector('defs')).toBeNull()
  })
})
