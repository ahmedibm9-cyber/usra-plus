/**
 * Lightweight Web Audio completion sound utility.
 * Plays a short ascending tone when a task is completed.
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null

  try {
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    return audioContext
  } catch {
    return null
  }
}

export function playCompletionSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const now = ctx.currentTime

  // First note - ascending tone
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(523.25, now) // C5
  osc1.frequency.linearRampToValueAtTime(659.25, now + 0.1) // E5
  gain1.gain.setValueAtTime(0.15, now)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.2)

  // Second note - higher harmony
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(783.99, now + 0.08) // G5
  osc2.frequency.linearRampToValueAtTime(880, now + 0.18) // A5
  gain2.gain.setValueAtTime(0, now)
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.08)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.05)
  osc2.stop(now + 0.3)
}
