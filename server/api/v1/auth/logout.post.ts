/**
 * POST /api/v1/auth/logout
 * Logout and revoke refresh token
 *
 * @version v1
 */

import type { ApiResponse } from '~/types/api'
import { revokeRefreshToken, revokeAllUserTokens } from '~/server/utils/auth'
import { requireAuth } from '~/server/utils/authMiddleware'

interface LogoutBody {
  refreshToken?: string
  allDevices?: boolean
}

export default defineEventHandler(async (event): Promise<ApiResponse<{ loggedOut: boolean }>> => {
  const user = await requireAuth(event)
  const body = await readBody<LogoutBody>(event)

  if (body.allDevices) {
    // Revoke all refresh tokens for user (logout everywhere)
    await revokeAllUserTokens(user.id)
  } else if (body.refreshToken) {
    // Revoke specific refresh token
    await revokeRefreshToken(body.refreshToken)
  }

  return {
    success: true,
    data: { loggedOut: true }
  }
})
