/**
 * Lightweight canvas-based confetti animation utility.
 * No external dependencies required.
 */

const CONFETTI_COLORS = ['#6366F1', '#A78BFA', '#22C55E', '#F59E0B', '#EC4899']

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

export function triggerConfetti(): void {
  if (typeof window === 'undefined') return

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
  const particleCount = 50 + Math.floor(Math.random() * 30) // 50-80
  const particles: Particle[] = []

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 4, // horizontal drift
      vy: Math.random() * 2 + 1, // initial downward velocity
      size: 4 + Math.random() * 4, // 4-8px
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      opacity: 1,
    })
  }

  const GRAVITY = 0.15
  const DRIFT = 0.02
  const startTime = Date.now()
  const DURATION = 2000 // ~2 seconds

  function animate() {
    const elapsed = Date.now() - startTime
    if (elapsed > DURATION) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fade out in the last 500ms
    const fadeStart = DURATION - 500
    const globalOpacity = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 500 : 1

    for (const p of particles) {
      p.vy += GRAVITY
      p.vx += (Math.random() - 0.5) * DRIFT
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.opacity = globalOpacity

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
