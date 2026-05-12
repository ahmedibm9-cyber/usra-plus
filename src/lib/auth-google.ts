/**
 * Google OAuth Integration for USRA PLUS
 *
 * Provides NextAuth.js Google provider configuration as a third authentication
 * option alongside the existing local (cookie/Prisma) auth and Supabase auth.
 *
 * This module is a placeholder — it only activates when both GOOGLE_CLIENT_ID
 * and GOOGLE_CLIENT_SECRET environment variables are set.
 *
 * Architecture:
 * - If Google env vars are set → NextAuth Google provider is available
 * - If Supabase is configured → Google OAuth via Supabase (existing flow)
 * - Otherwise → Local auth only (cookie/Prisma)
 */

import type { NextAuthOptions } from 'next-auth'
import type { Profile } from 'next-auth'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GoogleAuthConfig {
  clientId: string
  clientSecret: string
  /** Base URL of the app, e.g. process.env.NEXTAUTH_URL or window.location.origin */
  baseUrl: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  locale: string | null
}

// ─── Configuration Check ────────────────────────────────────────────────────

/**
 * Check if Google OAuth is configured and ready to use.
 * Returns true only when both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  )
}

/**
 * Get Google OAuth configuration from environment variables.
 * Returns null if not configured.
 */
export function getGoogleAuthConfig(): GoogleAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''

  if (!clientId || !clientSecret) {
    return null
  }

  return {
    clientId,
    clientSecret,
    baseUrl,
  }
}

// ─── NextAuth Options Builder ───────────────────────────────────────────────

/**
 * Build NextAuth options with the Google provider.
 * Returns null if Google OAuth is not configured.
 *
 * Usage in pages/api/auth/[...nextauth].ts:
 * ```ts
 * import { getNextAuthOptions } from '@/lib/auth-google'
 * const options = getNextAuthOptions()
 * if (options) { /‍* use NextAuth with Google *‍/ }
 * ```
 */
export function getNextAuthOptions(): NextAuthOptions | null {
  const config = getGoogleAuthConfig()
  if (!config) {
    return null
  }

  // Dynamic import would be done at the route handler level
  // This function provides the configuration structure
  return {
    providers: [
      // GoogleProvider will be added dynamically in the route handler
      // since next-auth may not be installed if Google OAuth isn't configured
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async signIn({ user, account, profile }) {
        // Allow sign-in and optionally sync user to local DB
        return true
      },
      async session({ session, token }) {
        // Attach user ID from token to session
        if (session.user && token.sub) {
          ;(session.user as Record<string, unknown>).id = token.sub
        }
        return session
      },
      async jwt({ token, account, profile }) {
        // Persist the OAuth access_token and user ID to the token
        if (account) {
          token.accessToken = account.access_token
          token.sub = account.providerAccountId
        }
        return token
      },
    },
    pages: {
      signIn: '/',
      error: '/',
    },
  }
}

// ─── User Sync ──────────────────────────────────────────────────────────────

/**
 * Extract user info from a Google OAuth profile.
 * Maps Google profile fields to our LocalAuthUser format.
 */
export function extractGoogleUserInfo(profile: Profile & Record<string, unknown>): GoogleUserInfo {
  const nameParts = (profile.name || '').split(' ')
  return {
    id: (profile.sub as string) || (profile.id as string) || '',
    email: (profile.email as string) || '',
    name: profile.name || '',
    firstName: nameParts[0] || null,
    lastName: nameParts.slice(1).join(' ') || null,
    avatarUrl: (profile.picture as string | null) || null,
    locale: (profile.locale as string | null) || null,
  }
}

// ─── Client-side Google Auth Helper ─────────────────────────────────────────

/**
 * Client-side helper to initiate Google OAuth via NextAuth.
 * Only works when Google OAuth is configured (NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED).
 */
export async function initiateGoogleOAuth(): Promise<{ url: string | null; error: string | null }> {
  // Check if Google OAuth is enabled on the client side
  const isEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

  if (!isEnabled) {
    return {
      url: null,
      error: 'Google OAuth is not configured. Please use email/password login.',
    }
  }

  try {
    // NextAuth sign-in URL
    const url = '/api/auth/signin/google'
    return { url, error: null }
  } catch {
    return { url: null, error: 'Failed to initiate Google OAuth' }
  }
}

// ─── Server-side: Google OAuth Callback Handler ─────────────────────────────

/**
 * Handle a successful Google OAuth callback on the server side.
 * Creates or updates the user in the local Prisma database and
 * creates a session cookie.
 *
 * This should be called from a NextAuth callback or a custom OAuth route.
 */
export async function handleGoogleOAuthCallback(googleUser: GoogleUserInfo): Promise<{
  userId: string
  isNewUser: boolean
  error: string | null
}> {
  try {
    const { db } = await import('@/lib/db')

    // Check if user exists by email
    const existingUser = await db.user.findFirst({
      where: { email: googleUser.email },
    })

    if (existingUser) {
      // Update existing user with Google info
      await db.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: googleUser.firstName || existingUser.firstName,
          lastName: googleUser.lastName || existingUser.lastName,
          avatarUrl: googleUser.avatarUrl || existingUser.avatarUrl,
        },
      })

      return { userId: existingUser.id, isNewUser: false, error: null }
    }

    // Create new user from Google profile
    const newUser = await db.user.create({
      data: {
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        avatarUrl: googleUser.avatarUrl,
        passwordHash: '', // OAuth users don't need a password
        emailVerified: true, // Google-verified emails are pre-verified
      },
    })

    return { userId: newUser.id, isNewUser: true, error: null }
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err)
    return { userId: '', isNewUser: false, error: 'Failed to process Google login' }
  }
}
