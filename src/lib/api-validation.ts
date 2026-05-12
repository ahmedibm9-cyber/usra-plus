/**
 * Zod validation schemas for API route request bodies.
 *
 * Usage in API routes:
 *   const result = validateBody(SchemaName, body)
 *   if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
 *   const data = result.data
 */

import { z } from 'zod/v4'

// ─── AI Routes ──────────────────────────────────────────────────

export const summarySchema = z.object({
  tasks: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
    pending: z.number().int().min(0),
    overdue: z.number().int().min(0),
    urgent: z.number().int().min(0),
    todayDue: z.number().int().min(0),
    byPriority: z.record(z.string(), z.number()).optional(),
  }),
  groceries: z.object({
    total: z.number().int().min(0),
    checked: z.number().int().min(0),
    unchecked: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
  }),
  events: z.object({
    today: z.array(z.object({
      title: z.string().max(200),
      time: z.string().max(50),
    })),
    upcoming: z.number().int().min(0),
  }),
  members: z.number().int().min(0),
  language: z.enum(['en', 'ar']).default('en'),
})

export const recipesSchema = z.object({
  items: z.array(z.string().max(100)).min(1).max(50),
  language: z.enum(['en', 'ar']).default('en'),
})

export const mealSuggestionsSchema = z.object({
  groceryItems: z.array(z.string().max(100)).min(1).max(50),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'any']).default('any'),
  preferences: z.string().max(500).optional(),
  language: z.enum(['en', 'ar']).default('en'),
})

export const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.enum(['avatar', 'icon', 'cover']).default('avatar'),
  size: z.enum(['256x256', '512x512']).default('512x512'),
})

// ─── Migrate Route ──────────────────────────────────────────────

export const migrateSchema = z.object({
  // Only allow empty body or confirm flag — database_url must come from env
  confirm: z.boolean().optional(),
}).strict()

// ─── Bug Reports ────────────────────────────────────────────────

export const bugReportSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  source: z.enum(['manual', 'auto', 'user_report']).default('manual'),
  errorType: z.string().max(100).optional(),
  stackTrace: z.string().max(10000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ─── Validation Helper ──────────────────────────────────────────

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
}

export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.issues[0]
  const message = firstError
    ? `${firstError.path.join('.')}: ${firstError.message}`
    : 'Validation failed'
  return { success: false, error: message }
}
