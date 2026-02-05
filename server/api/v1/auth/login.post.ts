/**
 * POST /api/v1/auth/login
 * Login with email and password
 *
 * @version v1
 */

import type { ApiResponse } from '~/types/api'
import {
  verifyPassword,
  generateTokenPair,
  storeRefreshToken,
  getRefreshTokenExpiry,
  isValidEmail
} from '~/server/utils/auth'
import { badRequest, unauthorized } from '~/server/utils/errors'

interface LoginBody {
  email: string
  password: string
}

interface LoginResponse {
  user: {
    id: string
    email: string
    name: string | null
  }
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

export default defineEventHandler(async (event): Promise<ApiResponse<LoginResponse>> => {
  const body = await readBody<LoginBody>(event)

  // Validate input
  if (!body.email?.trim()) {
    throw badRequest('AUTH_EMAIL_REQUIRED')
  }
  if (!isValidEmail(body.email.trim())) {
    throw badRequest('INVALID_EMAIL_FORMAT')
  }
  if (!body.password) {
    throw badRequest('AUTH_PASSWORD_REQUIRED')
  }

  const email = body.email.trim().toLowerCase()
  const prisma = usePrisma()

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true
    }
  })

  if (!user) {
    // Use generic message to prevent user enumeration
    throw unauthorized('AUTH_INVALID_CREDENTIALS')
  }

  // Verify password
  const isValid = await verifyPassword(body.password, user.password)

  if (!isValid) {
    throw unauthorized('AUTH_INVALID_CREDENTIALS')
  }

  // Generate tokens
  const tokens = await generateTokenPair({
    id: user.id,
    email: user.email,
    name: user.name
  })

  // Store refresh token
  await storeRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiry())

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      tokens
    }
  }
})
