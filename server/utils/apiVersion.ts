/**
 * API Versioning Utility
 *
 * This module provides utilities for API versioning in the Nuxt Todo application.
 *
 * VERSIONING STRATEGY:
 * ====================
 * 1. URL-based versioning: /api/v1/todos, /api/v2/todos, etc.
 * 2. Default version: v1 (for backward compatibility, /api/todos maps to /api/v1/todos)
 * 3. Version detection: Extracts version from URL path
 *
 * FOLDER STRUCTURE:
 * =================
 * server/api/
 *   v1/                    # Version 1 endpoints (current)
 *     todos/
 *     categories/
 *     tags/
 *     auth/
 *   todos/                 # Backward compatibility proxies (redirects to v1)
 *   categories/
 *   tags/
 *   auth/
 *
 * ADDING A NEW VERSION:
 * =====================
 * 1. Create server/api/v2/ folder
 * 2. Copy and modify endpoints as needed
 * 3. Update SUPPORTED_VERSIONS array
 * 4. Update LATEST_VERSION if the new version becomes default
 *
 * DEPRECATING A VERSION:
 * ======================
 * 1. Add version to DEPRECATED_VERSIONS array
 * 2. The middleware will add deprecation warnings in response headers
 * 3. Eventually remove from SUPPORTED_VERSIONS when EOL
 */

import type { H3Event } from 'h3'

// ============================================
// CONFIGURATION
// ============================================

/** All supported API versions */
export const SUPPORTED_VERSIONS = ['v1'] as const

/** The default version when none is specified in the URL */
export const DEFAULT_VERSION = 'v1'

/** The latest stable version */
export const LATEST_VERSION = 'v1'

/** Deprecated versions (will show warning headers) */
export const DEPRECATED_VERSIONS: string[] = []

/** Version type derived from supported versions */
export type ApiVersion = typeof SUPPORTED_VERSIONS[number]

// ============================================
// VERSION DETECTION
// ============================================

/**
 * Regex to match versioned API paths: /api/v1/..., /api/v2/...
 * Captures the version number
 */
const VERSION_REGEX = /^\/api\/(v\d+)\//

/**
 * Extracts the API version from the request path
 *
 * @param event - H3 event object
 * @returns The detected version or default version
 */
export function getApiVersion(event: H3Event): ApiVersion {
  const path = event.path
  const match = path.match(VERSION_REGEX)

  if (match) {
    const version = match[1] as ApiVersion
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version
    }
  }

  return DEFAULT_VERSION
}

/**
 * Checks if the request is using a versioned path
 *
 * @param event - H3 event object
 * @returns true if the path contains an explicit version
 */
export function isVersionedPath(event: H3Event): boolean {
  return VERSION_REGEX.test(event.path)
}

/**
 * Checks if the request is using a deprecated API version
 *
 * @param event - H3 event object
 * @returns true if the version is deprecated
 */
export function isDeprecatedVersion(event: H3Event): boolean {
  const version = getApiVersion(event)
  return DEPRECATED_VERSIONS.includes(version)
}

/**
 * Gets the unversioned path from a versioned path
 * e.g., /api/v1/todos -> /todos
 *
 * @param path - The request path
 * @returns The path without the /api/vX prefix
 */
export function getUnversionedPath(path: string): string {
  return path.replace(VERSION_REGEX, '/')
}

/**
 * Builds a versioned API path
 *
 * @param path - The resource path (e.g., /todos)
 * @param version - The API version (defaults to LATEST_VERSION)
 * @returns The full versioned path (e.g., /api/v1/todos)
 */
export function buildVersionedPath(path: string, version: ApiVersion = LATEST_VERSION): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/api/${version}${cleanPath}`
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Adds API version information to response headers
 *
 * @param event - H3 event object
 */
export function setVersionHeaders(event: H3Event): void {
  const version = getApiVersion(event)

  setHeader(event, 'X-API-Version', version)

  if (isDeprecatedVersion(event)) {
    setHeader(event, 'X-API-Deprecated', 'true')
    setHeader(event, 'X-API-Deprecation-Notice', `API version ${version} is deprecated. Please migrate to ${LATEST_VERSION}.`)
  }
}

/**
 * Creates a version info response object
 * Useful for health check or API info endpoints
 */
export function getVersionInfo(): {
  current: ApiVersion
  supported: readonly string[]
  deprecated: string[]
  latest: string
} {
  return {
    current: DEFAULT_VERSION,
    supported: SUPPORTED_VERSIONS,
    deprecated: DEPRECATED_VERSIONS,
    latest: LATEST_VERSION
  }
}
