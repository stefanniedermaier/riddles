/**
 * A tiny 2D particle system on a `<canvas>`: juice drops, sparks, stars and confetti.
 *
 * Particles are plain objects updated with simple physics (velocity, gravity, drag, spin)
 * and drawn every animation frame. The loop only runs while particles are alive, so an
 * idle layer costs nothing. Coordinates are CSS pixels relative to the canvas.
 */

export type ParticleShape = 'drop' | 'spark' | 'star' | 'confetti' | 'ring'

export interface Particle {
  shape: ParticleShape
  x: number
  y: number
  vx: number
  vy: number
  /** px/s² downwards. */
  gravity: number
  /** Velocity factor per second (1 = no drag, 0.2 = strong drag). */
  drag: number
  size: number
  color: string
  /** Seconds. */
  life: number
  age: number
  rot: number
  /** rad/s. */
  spin: number
  /** Confetti: phase of the "flip" (width oscillation). */
  flip: number
}

export type ParticleInit = Partial<Particle> & Pick<Particle, 'shape' | 'x' | 'y' | 'color'>

/** Upper bound of live particles; spawning more drops the oldest. */
const MAX_PARTICLES = 700

export const rand = (min: number, max: number) => min + Math.random() * (max - min)

export class ParticleLayer {
  private ctx: CanvasRenderingContext2D | null
  private particles: Particle[] = []
  private frame = 0
  private last = 0
  private width = 0
  private height = 0

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null
    this.resize()
  }

  /** Matches the canvas resolution to its CSS size (call when the layout changes). */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1)
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr))
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  spawn(list: ParticleInit[]): void {
    if (!this.ctx || list.length === 0) return
    for (const init of list) {
      this.particles.push({
        vx: 0,
        vy: 0,
        gravity: 0,
        drag: 1,
        size: 4,
        life: 0.6,
        age: 0,
        rot: 0,
        spin: 0,
        flip: Math.random() * Math.PI * 2,
        ...init,
      })
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES)
    }
    if (!this.frame) {
      this.last = performance.now()
      this.frame = requestAnimationFrame(this.tick)
    }
  }

  clear(): void {
    this.particles = []
    this.ctx?.clearRect(0, 0, this.width, this.height)
  }

  destroy(): void {
    cancelAnimationFrame(this.frame)
    this.frame = 0
    this.particles = []
  }

  private tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const ctx = this.ctx!
    ctx.clearRect(0, 0, this.width, this.height)

    const alive: Particle[] = []
    for (const p of this.particles) {
      p.age += dt
      if (p.age >= p.life) continue
      const drag = Math.pow(p.drag, dt)
      p.vx *= drag
      p.vy = p.vy * drag + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.spin * dt
      p.flip += dt * 9
      this.draw(ctx, p)
      alive.push(p)
    }
    this.particles = alive
    this.frame = alive.length > 0 ? requestAnimationFrame(this.tick) : 0
    if (!this.frame) ctx.clearRect(0, 0, this.width, this.height)
  }

  private draw(ctx: CanvasRenderingContext2D, p: Particle): void {
    const t = p.age / p.life
    // Fade out over the last 40 % of the life.
    ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    switch (p.shape) {
      case 'drop': {
        const r = p.size * (1 - t * 0.5)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.beginPath()
        ctx.arc(-r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'spark': {
        // A streak along the direction of travel.
        const speed = Math.hypot(p.vx, p.vy)
        const len = Math.min(p.size * 6, 4 + speed * 0.04)
        ctx.rotate(Math.atan2(p.vy, p.vx) - p.rot)
        ctx.strokeStyle = p.color
        ctx.lineCap = 'round'
        ctx.lineWidth = p.size * (1 - t * 0.6)
        ctx.beginPath()
        ctx.moveTo(-len, 0)
        ctx.lineTo(0, 0)
        ctx.stroke()
        break
      }
      case 'star': {
        const r = p.size * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) * 0.6)
        ctx.fillStyle = p.color
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 === 0 ? r : r * 0.32
          const a = (i * Math.PI) / 4
          ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
        }
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'confetti': {
        const w = p.size * Math.abs(Math.cos(p.flip))
        ctx.fillStyle = p.color
        ctx.fillRect(-w / 2, -p.size * 0.3, w, p.size * 0.6)
        break
      }
      case 'ring': {
        ctx.strokeStyle = p.color
        ctx.lineWidth = Math.max(0.5, p.size * 0.25 * (1 - t))
        ctx.beginPath()
        ctx.arc(0, 0, p.size * (0.3 + t * 1.2), 0, Math.PI * 2)
        ctx.stroke()
        break
      }
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }
}
