#!/usr/bin/env node
/**
 * Auto-fix script to add proper error handling to API route files.
 * Wraps handler functions in try/catch, ensures auth/rate-limit calls
 * are inside try/catch, adds console.error logging, and fixes HTTP status codes.
 */
import fs from 'fs'
import path from 'path'

const ROUTES_DIR = './src/app/api'

// Files that already have proper error handling (skip them)
const SKIP_FILES = new Set([
  'auth/local/login/route.ts',
  'auth/local/logout/route.ts',
  'auth/local/me/route.ts',
  'auth/local/signup/route.ts',
  'auth/verify/send/route.ts',
  'auth/verify/check/route.ts',
  'families/route.ts',
  'families/create/route.ts',
  'subscription/route.ts',
  'demo/seed/route.ts',
  'weather/route.ts',
])

// Map of route file paths to route name prefixes for logging
function getRouteName(filePath) {
  const rel = filePath.replace(ROUTES_DIR + '/', '').replace('/route.ts', '')
  return rel.replace(/\//g, '.').replace(/\[|\]/g, '')
}

function fixFile(filePath) {
  const rel = filePath.replace(ROUTES_DIR + '/', '')
  if (SKIP_FILES.has(rel)) {
    console.log(`SKIP (already OK): ${rel}`)
    return { fixed: false, handlers: 0 }
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  const routeName = getRouteName(filePath)
  let totalFixed = 0

  // Pattern 1: Admin routes with rate limit + auth OUTSIDE existing try/catch
  // The handler starts with rate limit + auth, then has inner try/catch
  // Fix: Move the try { to the beginning, merge catches

  // Pattern 1a: Handler with applyRateLimit + verifyAdminAuth + inner try/catch
  // This is the most common pattern in admin routes
  const adminPattern = /(export async function (GET|POST|PUT|PATCH|DELETE)\([^)]*\)\s*\{)\s*\n(\s*)(const rateLimitResponse = applyRateLimit\(request, RATE_LIMITS\.ADMIN_API\)\s*\n\s*if \(rateLimitResponse\) return rateLimitResponse\s*\n\s*\n\s*const auth = verifyAdminAuth\(request\)\s*\n\s*if \(!auth\.authenticated\)\s*\{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n)\s*\n(\s*try \{)/g

  if (adminPattern.test(content)) {
    // Reset lastIndex
    content = content.replace(adminPattern, (match, funcStart, method, indent, authBlock, innerTry) => {
      totalFixed++
      // Remove the inner try { and let the outer try handle it
      return `${funcStart}\n${indent}try {\n${indent}${authBlock.replace(/\n\s*/g, (m) => m)}${indent}// auth and rate-limit now inside try/catch\n${indent}`
    })
    // Also need to fix the catch - the existing inner catch needs to be replaced with outer catch
    // This is getting complex, let me try a different approach
  }

  // Let me try a simpler approach: find handlers that DON'T start with try {
  // and wrap them entirely

  content = fs.readFileSync(filePath, 'utf-8') // Re-read
  const originalContent = content

  // Find all exported handler functions
  const handlerRegex = /export async function (GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)\s*\{/g
  let match
  const handlers = []
  while ((match = handlerRegex.exec(content)) !== null) {
    handlers.push({
      method: match[1],
      startIndex: match.index,
      openBraceIndex: match.index + match[0].length - 1,
    })
  }

  if (handlers.length === 0) {
    console.log(`SKIP (no handlers): ${rel}`)
    return { fixed: false, handlers: 0 }
  }

  // For each handler, check if it starts with try { or has auth/rate-limit outside try
  // We process from the end to avoid index shifts
  for (let h = handlers.length - 1; h >= 0; h--) {
    const handler = handlers[h]
    const afterBrace = content.substring(handler.openBraceIndex + 1, handler.openBraceIndex + 200).trimStart()

    // Check if the handler already starts with try {
    if (afterBrace.startsWith('try {') || afterBrace.startsWith('try{')) {
      // Already has try/catch - check if it wraps auth
      // Look for common patterns that indicate auth is INSIDE try
      const handlerBody = getHandlerBody(content, handler.openBraceIndex + 1)
      if (handlerBody.includes('try {') && handlerBody.includes('applyRateLimit') &&
          handlerBody.indexOf('try {') < handlerBody.indexOf('applyRateLimit')) {
        // Auth is inside try - good
        continue
      }
      // If auth is before try, need to fix
      if (handlerBody.includes('applyRateLimit') &&
          handlerBody.indexOf('applyRateLimit') < handlerBody.indexOf('try {')) {
        // Need to extend the try to cover auth
        // This is the case where there's code before the try {
        // Just wrap the entire handler in another try/catch
      }
    }

    // Check for patterns that need fixing
    const handlerBody = getHandlerBody(content, handler.openBraceIndex + 1)
    const needsFix =
      (handlerBody.includes('applyRateLimit') && !bodyStartsWithTry(handlerBody)) ||
      (handlerBody.includes('verifyAdminAuth') && !bodyStartsWithTry(handlerBody)) ||
      (handlerBody.includes('requireAuth') && !bodyStartsWithTry(handlerBody)) ||
      (handlerBody.includes('checkRateLimit') && !bodyStartsWithTry(handlerBody)) ||
      (handlerBody.includes('verifySignedAdminAuth') && !bodyStartsWithTry(handlerBody)) ||
      (handlerBody.includes('getAuthenticatedUserId') && !bodyStartsWithTry(handlerBody))

    if (!needsFix) {
      continue
    }

    // This handler needs fixing - wrap entire body in try/catch
    totalFixed++

    // Find the matching closing brace for the handler function
    const bodyStart = handler.openBraceIndex + 1
    let depth = 1
    let i = bodyStart
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++
      else if (content[i] === '}') depth--
      i++
    }
    const bodyEnd = i - 1 // Index of the closing }

    // Get the body content
    const body = content.substring(bodyStart, bodyEnd)

    // Determine indentation
    const lineStart = content.lastIndexOf('\n', bodyStart)
    const indent = content.substring(lineStart + 1, bodyStart).match(/^\s*/)?.[0] || '  '

    // Check if body already ends with a catch block
    const trimmedBody = body.trimEnd()

    // If the body has an existing inner try/catch, we need to wrap around it
    // Add outer try/catch
    const newBody = `\n${indent}  try {${body.trimEnd()}\n${indent}  } catch (error) {\n${indent}    console.error('[${routeName}] Error:', error)\n${indent}    if (error instanceof Error && error.message.includes('Unauthorized')) {\n${indent}      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n${indent}    }\n${indent}    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })\n${indent}  }\n${indent}`

    content = content.substring(0, bodyStart) + newBody + content.substring(bodyEnd)
  }

  if (totalFixed > 0) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`FIXED ${totalFixed} handler(s): ${rel}`)
    return { fixed: true, handlers: totalFixed }
  } else {
    console.log(`SKIP (no issues): ${rel}`)
    return { fixed: false, handlers: 0 }
  }
}

function bodyStartsWithTry(body) {
  const trimmed = body.trimStart()
  return trimmed.startsWith('try {') || trimmed.startsWith('try{') || trimmed.startsWith('try\n')
}

function getHandlerBody(content, startIndex) {
  let depth = 1
  let i = startIndex
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') depth--
    i++
  }
  return content.substring(startIndex, i - 1)
}

// Recursively find all route.ts files
function findRouteFiles(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath))
    } else if (entry.name === 'route.ts') {
      files.push(fullPath)
    }
  }
  return files
}

// Main
const routeFiles = findRouteFiles(ROUTES_DIR)
console.log(`Found ${routeFiles.length} route files\n`)

let totalFixed = 0
let totalHandlers = 0

for (const file of routeFiles) {
  const result = fixFile(file)
  if (result.fixed) {
    totalFixed++
    totalHandlers += result.handlers
  }
}

console.log(`\n=== SUMMARY ===`)
console.log(`Files fixed: ${totalFixed}`)
console.log(`Handlers fixed: ${totalHandlers}`)
console.log(`Total route files: ${routeFiles.length}`)
