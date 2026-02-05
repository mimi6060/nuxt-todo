/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 *
 * @version v1
 */

import type { ApiResponse } from '~/types/api'
import {
  verifyToken,
  generateTokenPair,
  storeRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  getRefreshTokenExpiry
} from '~/server/utils/auth'
import { badRequest, unauthorized } from '~/server/utils/errors'

interface RefreshBody {
  refreshToken: string
}

interface RefreshResponse {
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

export default defineEventHandler(async (event): Promise<ApiResponse<RefreshResponse>> => {
  const body = await readBody<RefreshBody>(event)

  if (!body.refreshToken) {
    throw badRequest('AUTH_REFRESH_TOKEN_INVALID')
  }

  // Verify token signature and type
  const payload = await verifyToken(body.refreshToken)

  if (!payload || payload.type !== 'refresh') {
    throw unauthorized('AUTH_REFRESH_TOKEN_INVALID')
  }

  // Check if token is still valid in database
  const isValid = await isRefreshTokenValid(body.refreshToken)

  if (!isValid) {
    throw unauthorized('AUTH_REFRESH_TOKEN_INVALID')
  }

  // Get user
  const prisma = usePrisma()
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true }
  })

  if (!user) {
    throw unauthorized('AUTH_USER_NOT_FOUND')
  }

  // Revoke old refresh token (rotation)
  await revokeRefreshToken(body.refreshToken)

  // Generate new token pair
  const tokens = await generateTokenPair(user)

  // Store new refresh token
  await storeRefreshToken(user.id, tokens.refreshToken, getRefreshTokenExpiry())

  return {
    success: true,
    data: { tokens }
  }
})
