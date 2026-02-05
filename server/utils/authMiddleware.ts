/**
 * Auth Middleware - Protect API routes
 *
 * Provides middleware functions for:
 * - Requiring authentication
 * - Optional authentication
 * - Getting current user
 */

import type { H3Event } from 'h3'
import { extractBearerToken, verifyToken, type AuthUser } from './auth'
import { unauthorized } from './errors'

// ============================================
// TYPES
// ============================================

declare module 'h3' {
  interface H3EventContext {
    user?: AuthUser
    userId?: string
  }
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const token = extractBearerToken(event)

  if (!token) {
    throw unauthorized('AUTH_TOKEN_REQUIRED')
  }

  const payload = await verifyToken(token)

  if (!payload || payload.type !== 'access') {
    throw unauthorized('AUTH_TOKEN_INVALID')
  }

  // Verify user still exists
  const prisma = usePrisma()
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true }
  })

  if (!user) {
    throw unauthorized('AUTH_USER_NOT_FOUND')
  }

  // Attach user to event context
  event.context.user = user
  event.context.userId = user.id

  return user
}

/**
 * Optional authentication - doesn't throw, just attaches user if present
 */
export async function optionalAuth(event: H3Event): Promise<AuthUser | null> {
  const token = extractBearerToken(event)

  if (!token) {
    return null
  }

  const payload = await verifyToken(token)

  if (!payload || payload.type !== 'access') {
    return null
  }

  const prisma = usePrisma()
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true }
  })

  if (user) {
    event.context.user = user
    event.context.userId = user.id
  }

  return user
}

/**
 * Get current user from event context (after requireAuth)
 */
export function getCurrentUser(event: H3Event): AuthUser {
  const user = event.context.user

  if (!user) {
    throw unauthorized('AUTH_NOT_AUTHENTICATED')
  }

  return user
}

/**
 * Get current user ID from event context (after requireAuth)
 */
export function getCurrentUserId(event: H3Event): string {
  const userId = event.context.userId

  if (!userId) {
    throw unauthorized('AUTH_NOT_AUTHENTICATED')
  }

  return userId
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(event: H3Event): boolean {
  return !!event.context.user
}
