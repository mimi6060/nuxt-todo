/**
 * API Version Middleware
 *
 * Adds version information to all API responses via headers:
 * - X-API-Version: The version being used (e.g., v1)
 * - X-API-Deprecated: "true" if using a deprecated version
 * - X-API-Deprecation-Notice: Migration guidance for deprecated versions
 *
 * This middleware runs on all /api/ routes and adds helpful headers
 * for clients to understand which version they are using.
 */

import {
  getApiVersion,
  isDeprecatedVersion,
  LATEST_VERSION,
  setVersionHeaders
} from '~/server/utils/apiVersion'

export default defineEventHandler((event) => {
  // Only apply to API routes
  if (!event.path.startsWith('/api/')) {
    return
  }

  // Add version headers to response
  setVersionHeaders(event)

  // If using deprecated version, also add sunset header
  if (isDeprecatedVersion(event)) {
    const version = getApiVersion(event)
    // Sunset header indicates when the API version will be removed
    // Format: HTTP date (e.g., "Sat, 01 Jan 2025 00:00:00 GMT")
    setHeader(event, 'Sunset', 'TBD')
    setHeader(event, 'Link', `</api/${LATEST_VERSION}>; rel="successor-version"`)
  }
})
