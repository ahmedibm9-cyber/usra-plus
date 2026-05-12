/**
 * Local Authentication Client
 *
 * Bridges client-side auth calls to the /api/auth/local/* API routes.
 * Used when Supabase is not configured (demo/offline mode).
 * Authentication is backed by Prisma/SQLite with httpOnly cookie sessions.
 */

import type { UserProfile, Language, Theme } from '@/types'

// ─── Shape returned by the local auth API ──────────────────────────────────
export interface LocalAuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  countryCode: string | null
  avatarUrl: string | null
  language: string
  theme: string
  createdAt: string
  updatedAt: string
}

// ─── Convert camelCase API shape → snake_case UserProfile ──────────────────
export function localUserToProfile(user: LocalAuthUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    country_code: user.countryCode,
    avatar_url: user.avatarUrl,
    language: (user.language === 'ar' ? 'ar' : 'en') as Language,
    theme: (user.theme === 'light' ? 'light' : 'dark') as Theme,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────
export async function localLogin({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<{ user: LocalAuthUser | null; error: string | null }> {
  try {
    const res = await fetch('/api/auth/local/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { user: null, error: data.error || 'Login failed' }
    }

    return { user: data.user as LocalAuthUser, error: null }
  } catch (err) {
    console.error('[Local Auth] Login request error:', err)
    return { user: null, error: 'Network error. Please try again.' }
  }
}

// ─── Sign Up ───────────────────────────────────────────────────────────────
export async function localSignUp({
  firstName,
  lastName,
  email,
  password,
  phone,
  countryCode,
}: {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  countryCode?: string
}): Promise<{ user: LocalAuthUser | null; error: string | null; devCode?: string; needsVerification?: boolean }> {
  try {
    const res = await fetch('/api/auth/local/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        phone: phone || null,
        countryCode: countryCode || '+966',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { user: null, error: data.error || 'Signup failed' }
    }

    return {
      user: data.user as LocalAuthUser,
      error: null,
      devCode: data.devCode,
      needsVerification: data.needsVerification,
    }
  } catch (err) {
    console.error('[Local Auth] Signup request error:', err)
    return { user: null, error: 'Network error. Please try again.' }
  }
}

// ─── Get Current User (session check) ──────────────────────────────────────
export async function localGetMe(): Promise<{ user: LocalAuthUser | null }> {
  try {
    const res = await fetch('/api/auth/local/me', {
      method: 'GET',
      credentials: 'include', // ensure cookie is sent
    })

    if (!res.ok) {
      return { user: null }
    }

    const data = await res.json()
    return { user: data.user as LocalAuthUser | null }
  } catch (err) {
    console.error('[Local Auth] GetMe request error:', err)
    return { user: null }
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────
export async function localLogout(): Promise<void> {
  try {
    await fetch('/api/auth/local/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (err) {
    console.error('[Local Auth] Logout request error:', err)
  }
}

// ─── Send Verification Code ────────────────────────────────────────────────
export async function localSendVerificationCode(email: string): Promise<{
  success: boolean
  devCode?: string
  expiresIn?: number
  alreadyVerified?: boolean
  error: string | null
}> {
  try {
    const res = await fetch('/api/auth/verify/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send verification code' }
    }

    return {
      success: true,
      devCode: data.devCode,
      expiresIn: data.expiresIn,
      alreadyVerified: data.alreadyVerified,
      error: null,
    }
  } catch (err) {
    console.error('[Local Auth] Send verification code error:', err)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Verify OTP Code ───────────────────────────────────────────────────────
export async function localVerifyCode(email: string, code: string): Promise<{
  success: boolean
  user: LocalAuthUser | null
  error: string | null
}> {
  try {
    const res = await fetch('/api/auth/verify/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, user: null, error: data.error || 'Verification failed' }
    }

    return {
      success: true,
      user: data.user as LocalAuthUser,
      error: null,
    }
  } catch (err) {
    console.error('[Local Auth] Verify code error:', err)
    return { success: false, user: null, error: 'Network error. Please try again.' }
  }
}
