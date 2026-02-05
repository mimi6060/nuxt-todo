/**
 * POST /api/v1/auth/register
 * Register a new user account
 *
 * @version v1
 */

import type { ApiResponse } from '~/types/api'
import {
  hashPassword,
  generateTokenPair,
  storeRefreshToken,
  getRefreshTokenExpiry,
  isValidEmail,
  isValidPassword
} from '~/server/utils/auth'
import { badRequest, conflict } from '~/server/utils/errors'

interface RegisterBody {
  email: string
  password: string
  name?: string
}

interface RegisterResponse {
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

export default defineEventHandler(async (event): Promise<ApiResponse<RegisterResponse>> => {
  const body = await readBody<RegisterBody>(event)

  // Validate email
  if (!body.email?.trim()) {
    throw badRequest('AUTH_EMAIL_REQUIRED')
  }
  if (!isValidEmail(body.email.trim())) {
    throw badRequest('INVALID_EMAIL_FORMAT')
  }

  // Validate password
  if (!body.password) {
    throw badRequest('AUTH_PASSWORD_REQUIRED')
  }
  const passwordValidation = isValidPassword(body.password)
  if (!passwordValidation.valid) {
    throw badRequest(passwordValidation.message as any)
  }

  const email = body.email.trim().toLowerCase()
  const prisma = usePrisma()

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw conflict('AUTH_EMAIL_EXISTS')
  }

  // Hash password and create user
  const hashedPassword = await hashPassword(body.password)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: body.name?.trim() || null
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  })

  // Generate tokens
  const tokens = await generateTokenPair(user)

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
      user,
      tokens
    }
  }
})
