/**
 * Notification Sound Utility
 * Uses Web Audio API to create short pleasant chime sounds
 * No external audio files needed
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      console.warn('[NotificationSound] Web Audio API not supported')
      return null
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

/**
 * Play a short pleasant chime sound (default notification)
 */
export function playDefaultSound(volume: number = 0.5): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const gainNode = ctx.createGain()
  gainNode.connect(ctx.destination)
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

  // Two-tone chime: E5 + G5
  const frequencies = [659.25, 783.99]
  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator()
    oscillator.connect(gainNode)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(freq, now + i * 0.12)
    oscillator.start(now + i * 0.12)
    oscillator.stop(now + 0.6)
  })
}

/**
 * Play an ascending success tone
 */
export function playSuccessSound(volume: number = 0.5): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const gainNode = ctx.createGain()
  gainNode.connect(ctx.destination)
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(volume * 0.35, now + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

  // Ascending three-tone: C5 → E5 → G5
  const frequencies = [523.25, 659.25, 783.99]
  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator()
    oscillator.connect(gainNode)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(freq, now + i * 0.15)
    oscillator.start(now + i * 0.15)
    oscillator.stop(now + 0.8)
  })
}

/**
 * Play a notification sound by type
 */
export function playNotificationSound(
  type: 'default' | 'success' = 'default',
  volume: number = 0.5
): void {
  if (type === 'success') {
    playSuccessSound(volume)
  } else {
    playDefaultSound(volume)
  }
}

/**
 * Resume audio context on user interaction (required by browsers)
 */
export function initAudioContext(): void {
  getAudioContext()
}
