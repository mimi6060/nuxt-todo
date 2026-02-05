/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 *
 * @version v1
 */

import type { ApiResponse } from '~/types/api'
import { requireAuth } from '~/server/utils/authMiddleware'

interface MeResponse {
  id: string
  email: string
  name: string | null
  createdAt: string
  lastLoginAt: string | null
}

export default defineEventHandler(async (event): Promise<ApiResponse<MeResponse>> => {
  const user = await requireAuth(event)

  const prisma = usePrisma()
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      lastLoginAt: true
    }
  })

  if (!fullUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return {
    success: true,
    data: {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      createdAt: fullUser.createdAt.toISOString(),
      lastLoginAt: fullUser.lastLoginAt?.toISOString() || null
    }
  }
})
