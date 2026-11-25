/**
 * Shared SVG definitions (gradients) for art drawn many times on a page.
 *
 * The definitions live once in a hidden `<svg>` in the document body and are referenced by
 * id (`url(#…)`) from every instance: no `<defs>` per instance, no duplicate ids. The
 * hidden svg must not use `display: none` – some browsers then drop the gradients.
 * `shareImage.ts` copies referenced definitions into an svg it turns into an image.
 */
export function ensureSvgDefs(id: string, markup: string): void {
  if (typeof document === 'undefined' || document.getElementById(id)) return
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.id = id
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.overflow = 'hidden'
  svg.style.pointerEvents = 'none'
  svg.innerHTML = `<defs>${markup}</defs>`
  document.body.prepend(svg)
}
