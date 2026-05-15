/**
 * Safe Fetch Utilities for USRA PLUS
 *
 * Prevents "SyntaxError: Unexpected token '<'" crashes when an API endpoint
 * returns HTML instead of JSON (e.g. 404, 500, or redirect pages).
 *
 * Usage:
 *   const data = await safeJsonResponse<MyType>(response)
 *   if (!data) { // handle error }
 */

/**
 * Safely parse a fetch Response as JSON.
 *
 * Checks the Content-Type header before attempting to parse, and wraps
 * everything in a try/catch for additional safety.
 *
 * @param response - The fetch Response object
 * @returns The parsed JSON data, or null if the response is not JSON or parsing fails
 */
export async function safeJsonResponse<T = unknown>(response: Response): Promise<T | null> {
  try {
    const contentType = response.headers.get('content-type')

    // Check if the response declares itself as JSON
    // Some APIs use 'application/json; charset=utf-8' so we use includes()
    if (!contentType || !contentType.includes('application/json')) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[safeJsonResponse] Non-JSON response received (Content-Type: ${contentType}, Status: ${response.status}). ` +
          `URL: ${response.url || 'unknown'}`
        )
      }
      return null
    }

    const data = await response.json()
    return data as T
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[safeJsonResponse] Failed to parse JSON response (Status: ${response.status}):`,
        err
      )
    }
    return null
  }
}
