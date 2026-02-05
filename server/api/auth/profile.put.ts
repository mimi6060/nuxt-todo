/**
 * PUT /api/auth/profile
 * Update current user's profile
 */

import type { ApiResponse } from '~/types/api'
import { requireAuth, getCurrentUserId } from '~/server/utils/authMiddleware'
import { badRequest, serverError } from '~/server/utils/errors'

interface ProfileUpdateBody {
  name?: string | null
}

interface UserProfile {
  id: string
  email: string
  name: string | null
}

export default defineEventHandler(async (event): Promise<ApiResponse<UserProfile>> => {
  await requireAuth(event)
  const userId = getCurrentUserId(event)
  const prisma = usePrisma()

  const body = await readBody<ProfileUpdateBody>(event)

  // Validate name length if provided
  if (body.name !== undefined && body.name !== null && body.name.length > 100) {
    throw badRequest('NAME_TOO_LONG')
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name !== undefined ? body.name : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    return {
      success: true,
      data: updatedUser,
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    throw serverError('PROFILE_UPDATE_ERROR')
  }
})
