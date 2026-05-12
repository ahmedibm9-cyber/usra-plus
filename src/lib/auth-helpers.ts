/**
 * Shared auth helpers — eliminates the duplicated buildUserProfileFromSession
 * function that was copy-pasted in page.tsx and main-app.tsx.
 */

export interface SupabaseSession {
  user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
}

export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  language: 'en' | 'ar'
  theme: 'dark' | 'light'
  phone: string | null
  country_code: string
  created_at: string
  updated_at: string
}

export function buildUserProfileFromSession(session: SupabaseSession): UserProfile {
  return {
    id: session.user.id,
    email: session.user.email || '',
    first_name: (session.user.user_metadata?.first_name as string) || '',
    last_name: (session.user.user_metadata?.last_name as string) || '',
    avatar_url: (session.user.user_metadata?.avatar_url as string | null) || null,
    language: 'en' as const,
    theme: 'dark' as const,
    phone: null,
    country_code: '+966',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
