/**
 * Cloudflare Turnstile Integration for USRA PLUS
 *
 * Provides client-side widget rendering and server-side token verification
 * for Cloudflare Turnstile (CAPTCHA alternative).
 *
 * The widget only renders when TURNSTILE_SITE_KEY is set in the environment.
 * Server-side verification only runs when TURNSTILE_SECRET_KEY is set.
 * If keys are not configured, all checks pass (graceful degradation).
 */

// ─── Client-Side ────────────────────────────────────────────────────────────

/** Turnstile widget render options */
export interface TurnstileRenderOptions {
  /** The container element or ID to render the widget in */
  container: string | HTMLElement
  /** Callback when challenge is completed successfully */
  callback: (token: string) => void
  /** Callback when challenge expires */
  'expired-callback'?: () => void
  /** Callback when challenge encounters an error */
  'error-callback'?: (error: string) => void
  /** Theme: 'light', 'dark', or 'auto' */
  theme?: 'light' | 'dark' | 'auto'
  /** Size: 'normal' or 'compact' */
  size?: 'normal' | 'compact'
  /** Language code (e.g. 'ar', 'en') */
  language?: string
  /** Appearance: 'always' or 'execute' or 'interaction-only' */
  appearance?: 'always' | 'execute' | 'interaction-only'
}

/** Check if Turnstile is enabled on the client side */
export function isTurnstileEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
}

/** Get the Turnstile site key for client-side rendering */
export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
}

/**
 * Load the Turnstile script into the page.
 * Only loads once — subsequent calls are no-ops.
 * Returns a promise that resolves when the script is loaded.
 */
export function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      resolve()
      return
    }

    // Already loading
    const existing = document.getElementById('turnstile-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')))
      return
    }

    const script = document.createElement('script')
    script.id = 'turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    script.defer = true

    // Global callback for when the script loads
    ;(window as any).onTurnstileLoad = () => resolve()

    script.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')))

    document.head.appendChild(script)
  })
}

/**
 * Render a Turnstile widget in the specified container.
 * Returns the widget ID for later removal/reset, or null on failure.
 */
export async function renderTurnstile(options: TurnstileRenderOptions): Promise<string | null> {
  if (!isTurnstileEnabled()) {
    return null
  }

  try {
    await loadTurnstileScript()

    const turnstile = (window as any).turnstile
    if (!turnstile) {
      console.warn('[Turnstile] Script loaded but turnstile object not found')
      return null
    }

    const siteKey = getTurnstileSiteKey()

    const widgetId = turnstile.render(options.container, {
      sitekey: siteKey,
      callback: options.callback,
      'expired-callback': options['expired-callback'],
      'error-callback': options['error-callback'],
      theme: options.theme || 'auto',
      size: options.size || 'normal',
      language: options.language || 'auto',
      appearance: options.appearance || 'always',
    })

    return widgetId
  } catch (err) {
    console.error('[Turnstile] Failed to render widget:', err)
    return null
  }
}

/**
 * Remove a rendered Turnstile widget.
 */
export function removeTurnstile(widgetId: string): void {
  try {
    const turnstile = (window as any).turnstile
    if (turnstile && widgetId) {
      turnstile.remove(widgetId)
    }
  } catch (err) {
    console.warn('[Turnstile] Failed to remove widget:', err)
  }
}

/**
 * Reset a rendered Turnstile widget (e.g. after form submission).
 */
export function resetTurnstile(widgetId: string): void {
  try {
    const turnstile = (window as any).turnstile
    if (turnstile && widgetId) {
      turnstile.reset(widgetId)
    }
  } catch (err) {
    console.warn('[Turnstile] Failed to reset widget:', err)
  }
}

// ─── Server-Side ────────────────────────────────────────────────────────────

/**
 * Verify a Turnstile token on the server side.
 * Returns true if the token is valid, or if Turnstile is not configured (graceful degradation).
 *
 * @param token - The token from the client-side widget
 * @param remoteIp - The user's IP address (optional, for extra verification)
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<{
  success: boolean
  error?: string
}> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If Turnstile is not configured on the server, allow through
  if (!secretKey) {
    return { success: true }
  }

  // If no token provided but Turnstile is configured, reject
  if (!token) {
    return { success: false, error: 'Turnstile verification required' }
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    })

    const data = await response.json()

    if (data.success) {
      return { success: true }
    }

    const errorCodes = data['error-codes'] || []
    console.warn('[Turnstile] Verification failed:', errorCodes)
    return {
      success: false,
      error: `Turnstile verification failed: ${errorCodes.join(', ')}`,
    }
  } catch (err) {
    console.error('[Turnstile] Verification request error:', err)
    // On network error, allow through to avoid blocking users
    return { success: true }
  }
}
