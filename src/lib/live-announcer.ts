// A simple live region announcer for screen readers
let liveRegion: HTMLElement | null = null

function getLiveRegion(priority: 'polite' | 'assertive'): HTMLElement {
  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
  }
  liveRegion.setAttribute('aria-live', priority)
  return liveRegion
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const region = getLiveRegion(priority)
  region.textContent = ''
  // Small delay to ensure screen readers pick up the change
  setTimeout(() => { region.textContent = message }, 100)
}
