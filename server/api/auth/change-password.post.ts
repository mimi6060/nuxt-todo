/**
 * POST /api/auth/change-password
 * Change current user's password
 */

import type { ApiResponse } from '~/types/api'
import { requireAuth, getCurrentUserId } from '~/server/utils/authMiddleware'
import { badRequest, serverError } from '~/server/utils/errors'
import bcrypt from 'bcryptjs'

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
}

export default defineEventHandler(async (event): Promise<ApiResponse<{ success: boolean }>> => {
  await requireAuth(event)
  const userId = getCurrentUserId(event)
  const prisma = usePrisma()

  const body = await readBody<ChangePasswordBody>(event)

  // Validation
  if (!body.currentPassword) {
    throw badRequest('CURRENT_PASSWORD_REQUIRED')
  }
  if (!body.newPassword) {
    throw badRequest('NEW_PASSWORD_REQUIRED')
  }
  if (body.newPassword.length < 8) {
    throw badRequest('PASSWORD_TOO_SHORT')
  }
  if (body.newPassword.length > 128) {
    throw badRequest('PASSWORD_TOO_LONG')
  }
  // Check for uppercase
  if (!/[A-Z]/.test(body.newPassword)) {
    throw badRequest('PASSWORD_NEEDS_UPPERCASE')
  }
  // Check for lowercase
  if (!/[a-z]/.test(body.newPassword)) {
    throw badRequest('PASSWORD_NEEDS_LOWERCASE')
  }
  // Check for number
  if (!/[0-9]/.test(body.newPassword)) {
    throw badRequest('PASSWORD_NEEDS_NUMBER')
  }

  try {
    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })

    if (!user) {
      throw badRequest('AUTH_USER_NOT_FOUND')
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(body.currentPassword, user.password)
    if (!isValidPassword) {
      throw badRequest('CURRENT_PASSWORD_INCORRECT')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(body.newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return {
      success: true,
      data: { success: true },
    }
  } catch (error: any) {
    // Re-throw if it's already an HTTP error
    if (error?.statusCode) {
      throw error
    }
    console.error('Error changing password:', error)
    throw serverError('PASSWORD_CHANGE_ERROR')
  }
})
