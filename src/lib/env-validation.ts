/**
 * Environment Variable Validation for USRA PLUS
 *
 * Validates critical environment variables at startup.
 * Missing required vars will log a clear warning.
 * In production, missing critical vars will throw and prevent startup.
 */

import { logger } from '@/lib/logger'

interface EnvVarSpec {
  name: string
  required: boolean
  critical: boolean // If true, app cannot function without it
  description: string
  validate?: (value: string) => boolean
}

const ENV_SPECS: EnvVarSpec[] = [
  // Database
  { name: 'DATABASE_URL', required: true, critical: true, description: 'Prisma database connection string' },
  
  // Auth
  { name: 'ADMIN_PASSWORD', required: false, critical: true, description: 'Admin panel password — NO default in production. Set this before deploying!' },
  
  // Email (Resend)
  { name: 'RESEND_API_KEY', required: false, critical: false, description: 'Resend API key for email delivery (OTP, welcome, billing)', validate: (v) => v.startsWith('re_') },
  { name: 'EMAIL_FROM', required: false, critical: false, description: 'Sender email address (e.g., noreply@usraplus.com)' },
  
  // Monitoring
  { name: 'NEXT_PUBLIC_SENTRY_DSN', required: false, critical: false, description: 'Sentry DSN for error tracking' },
  
  // Rate Limiting
  { name: 'UPSTASH_REDIS_REST_URL', required: false, critical: false, description: 'Upstash Redis URL for distributed rate limiting' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', required: false, critical: false, description: 'Upstash Redis token' },
  
  // Supabase
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: false, critical: false, description: 'Supabase project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: false, critical: false, description: 'Supabase anonymous key' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false, critical: false, description: 'Supabase service role key (admin)' },
]

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
  errors: string[]
}

/**
 * Validate environment variables.
 * Call this early in the application lifecycle.
 */
export function validateEnvironment(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === 'production'
  const missing: string[] = []
  const warnings: string[] = []
  const errors: string[] = []

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.name]

    if (!value) {
      if (spec.required || (spec.critical && isProduction)) {
        errors.push(`❌ ${spec.name}: ${spec.description}`)
        missing.push(spec.name)
      } else {
        warnings.push(`⚠️  ${spec.name}: Not set — ${spec.description}`)
      }
    } else if (spec.validate && !spec.validate(value)) {
      errors.push(`❌ ${spec.name}: Invalid format — ${spec.description}`)
    }
  }

  // Production-specific warnings
  if (isProduction) {
    if (!process.env.RESEND_API_KEY) {
      warnings.push('⚠️  RESEND_API_KEY not set — email delivery will be disabled, OTP verification will not work')
    }
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      warnings.push('⚠️  NEXT_PUBLIC_SENTRY_DSN not set — no error monitoring in production')
    }
  }

  if (errors.length > 0 || missing.length > 0) {
    logger.error('[Env]', 'ENVIRONMENT VALIDATION FAILED')
    errors.forEach(e => console.error(`  ${e}`))
    warnings.forEach(w => console.warn(`  ${w}`))
    console.error('')
    
    if (isProduction && missing.length > 0) {
      throw new Error(`Missing critical environment variables: ${missing.join(', ')}. Application cannot start.`)
    }
  } else if (warnings.length > 0) {
    console.warn('\n🟡 ENVIRONMENT WARNINGS:\n')
    warnings.forEach(w => console.warn(`  ${w}`))
    console.warn('')
  } else {
    logger.info('[Env]', 'Environment validation passed')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    errors,
  }
}
