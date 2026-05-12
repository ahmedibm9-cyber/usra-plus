/**
 * Lightweight canvas-based confetti animation utility.
 * No external dependencies required.
 */

const DEFAULT_COLORS = ['#E50914', '#E50914', '#22C55E', '#F59E0B', '#EC4899']
const TASK_COMPLETION_COLORS = ['#E50914', '#E50914', '#F59E0B', '#10B981']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  shape: 'rect' | 'circle'
  opacity: number
}

interface ConfettiOptions {
  colors?: string[]
  particleCount?: number
  duration?: number
  originX?: number
  originY?: number
}

export function triggerConfetti(options?: ConfettiOptions): void {
  if (typeof window === 'undefined') return

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const colors = options?.colors ?? DEFAULT_COLORS
  const particleCount = options?.particleCount ?? (50 + Math.floor(Math.random() * 30))
  const duration = options?.duration ?? 2000
  const originX = options?.originX ?? undefined
  const originY = options?.originY ?? undefined

  // Create canvas overlay
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  // Generate particles
  const particles: Particle[] = []

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: originX !== undefined ? originX + (Math.random() - 0.5) * 200 : Math.random() * canvas.width,
      y: originY !== undefined ? originY - Math.random() * 50 : -20 - Math.random() * canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 4,
      vy: originY !== undefined ? -(Math.random() * 4 + 2) : Math.random() * 2 + 1,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      opacity: 1,
    })
  }

  const GRAVITY = 0.15
  const DRIFT = 0.02
  const startTime = Date.now()

  function animate() {
    const elapsed = Date.now() - startTime
    if (elapsed > duration) {
      canvas.remove()
      return
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height)

    const fadeStart = duration - 500
    const globalOpacity = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 500 : 1

    for (const p of particles) {
      p.vy += GRAVITY
      p.vx += (Math.random() - 0.5) * DRIFT
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.opacity = globalOpacity

      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rotation)
      ctx!.globalAlpha = p.opacity
      ctx!.fillStyle = p.color

      if (p.shape === 'rect') {
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      } else {
        ctx!.beginPath()
        ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx!.fill()
      }

      ctx!.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}

/**
 * Trigger a short, themed confetti burst for task completion.
 * Uses Signal Red, Accent Yellow, White, Black colors with 30 particles and 800ms duration.
 */
export function triggerTaskCompletionConfetti(originX?: number, originY?: number): void {
  triggerConfetti({
    colors: TASK_COMPLETION_COLORS,
    particleCount: 30,
    duration: 800,
    originX,
    originY,
  })
}
