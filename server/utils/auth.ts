/**
 * Auth Utilities - JWT and Password Management
 *
 * Provides secure authentication utilities:
 * - Password hashing with bcrypt
 * - JWT token generation and verification
 * - Refresh token management
 */

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { H3Event } from 'h3'

// ============================================
// CONFIGURATION
// ============================================

const config = useRuntimeConfig()

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
)
const ACCESS_TOKEN_EXPIRY = '15m'  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'  // 7 days
const BCRYPT_ROUNDS = 12

// ============================================
// TYPES
// ============================================

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  type: 'access' | 'refresh'
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number // seconds
}

// ============================================
// PASSWORD UTILITIES
// ============================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// JWT UTILITIES
// ============================================

/**
 * Generate an access token
 */
export async function generateAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    type: 'access'
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setSubject(user.id)
    .sign(JWT_SECRET)
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    type: 'refresh'
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setSubject(user.id)
    .sign(JWT_SECRET)
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(user: AuthUser): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user)
  ])

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes in seconds
  }
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as TokenPayload
  } catch {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(event: H3Event): string | null {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice(7)
}

// ============================================
// REFRESH TOKEN DATABASE OPERATIONS
// ============================================

/**
 * Store a refresh token in database
 */
export async function storeRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const prisma = usePrisma()

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  })
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const prisma = usePrisma()

  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() }
  })
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const prisma = usePrisma()

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })
}

/**
 * Check if a refresh token is valid (exists, not expired, not revoked)
 */
export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const prisma = usePrisma()

  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token }
  })

  if (!refreshToken) return false
  if (refreshToken.revokedAt) return false
  if (refreshToken.expiresAt < new Date()) return false

  return true
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const prisma = usePrisma()

  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } }
      ]
    }
  })

  return result.count
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'PASSWORD_TOO_SHORT' }
  }
  if (password.length > 100) {
    return { valid: false, message: 'PASSWORD_TOO_LONG' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'PASSWORD_NEEDS_UPPERCASE' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'PASSWORD_NEEDS_LOWERCASE' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'PASSWORD_NEEDS_NUMBER' }
  }

  return { valid: true }
}

// ============================================
// REFRESH TOKEN EXPIRY CALCULATION
// ============================================

/**
 * Calculate refresh token expiry date
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7) // 7 days
  return expiry
}
