/**
 * Helpers pour la gestion standardisée des erreurs API
 * Utilise des codes d'erreur qui peuvent être traduits côté client
 */

export type ErrorCode =
  // Auth errors
  | 'AUTH_TOKEN_REQUIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_NOT_AUTHENTICATED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_EXISTS'
  | 'AUTH_EMAIL_REQUIRED'
  | 'AUTH_PASSWORD_REQUIRED'
  | 'AUTH_REFRESH_TOKEN_INVALID'
  | 'CURRENT_PASSWORD_REQUIRED'
  | 'CURRENT_PASSWORD_INCORRECT'
  | 'NEW_PASSWORD_REQUIRED'
  | 'PASSWORD_CHANGE_ERROR'
  | 'PROFILE_UPDATE_ERROR'
  | 'NAME_TOO_LONG'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_NEEDS_UPPERCASE'
  | 'PASSWORD_NEEDS_LOWERCASE'
  | 'PASSWORD_NEEDS_NUMBER'
  | 'INVALID_EMAIL_FORMAT'
  // Category errors
  | 'CATEGORY_NAME_REQUIRED'
  | 'COLOR_REQUIRED'
  | 'CATEGORY_EXISTS'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_ID_REQUIRED'
  | 'CATEGORY_HAS_TODOS'
  | 'CATEGORY_CREATE_ERROR'
  | 'CATEGORY_UPDATE_ERROR'
  | 'CATEGORY_DELETE_ERROR'
  | 'CATEGORY_FETCH_ERROR'
  // Todo errors
  | 'TODO_TITLE_REQUIRED'
  | 'TODO_CATEGORY_REQUIRED'
  | 'TODO_NOT_FOUND'
  | 'TODO_ID_REQUIRED'
  | 'TODO_CREATE_ERROR'
  | 'TODO_UPDATE_ERROR'
  | 'TODO_DELETE_ERROR'
  | 'TODO_FETCH_ERROR'
  | 'TODO_INVALID_DEADLINE'
  | 'TODO_INVALID_PRIORITY'
  // Tag errors
  | 'TAG_NAME_REQUIRED'
  | 'TAG_EXISTS'
  | 'TAG_NOT_FOUND'
  | 'TAG_ID_REQUIRED'
  | 'TAG_CREATE_ERROR'
  | 'TAG_UPDATE_ERROR'
  | 'TAG_DELETE_ERROR'
  | 'TAG_FETCH_ERROR'
  | 'TAGS_FETCH_ERROR'
  | 'TAG_MERGE_ERROR'
  // Validation errors
  | 'VALIDATION_FAILED'
  | 'INVALID_INPUT'
  | 'FIELD_REQUIRED'
  | 'STRING_TOO_LONG'
  | 'STRING_TOO_SHORT'
  | 'TODO_TITLE_TOO_LONG'
  | 'TODO_DESCRIPTION_TOO_LONG'
  | 'CATEGORY_NAME_TOO_LONG'
  | 'TAG_NAME_TOO_LONG'
  // Database errors
  | 'DATABASE_CONNECTION_ERROR'
  | 'DATABASE_TIMEOUT'
  | 'UNIQUE_CONSTRAINT_VIOLATION'
  | 'FOREIGN_KEY_VIOLATION'
  // Generic
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'

export const badRequest = (code: ErrorCode) =>
  createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: code,
    data: { code },
  })

export const notFound = (code: ErrorCode) =>
  createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: code,
    data: { code },
  })

export const conflict = (code: ErrorCode) =>
  createError({
    statusCode: 409,
    statusMessage: 'Conflict',
    message: code,
    data: { code },
  })

export const serverError = (code: ErrorCode) =>
  createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: code,
    data: { code },
  })

export const unauthorized = (code: ErrorCode = 'UNAUTHORIZED') =>
  createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: code,
    data: { code },
  })

export const forbidden = (code: ErrorCode = 'FORBIDDEN') =>
  createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message: code,
    data: { code },
  })

export const rateLimited = (code: ErrorCode = 'RATE_LIMITED') =>
  createError({
    statusCode: 429,
    statusMessage: 'Too Many Requests',
    message: code,
    data: { code },
  })

/**
 * Prisma error codes reference:
 * P2000 - Value too long for column
 * P2002 - Unique constraint violation
 * P2003 - Foreign key constraint violation
 * P2025 - Record not found (operation depends on record existing)
 * P2024 - Connection timed out
 * P1001 - Can't reach database server
 * P1002 - Database server timed out
 */

export interface PrismaError {
  code?: string
  meta?: {
    target?: string[]
    field_name?: string
    cause?: string
  }
  message?: string
}

/**
 * Check if error is a Prisma error
 */
export function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaError).code === 'string' &&
    (error as PrismaError).code!.startsWith('P')
  )
}

/**
 * Handle Prisma errors and convert them to appropriate HTTP errors
 * Returns the appropriate error to throw, or null if not a Prisma error
 */
export function handlePrismaError(
  error: unknown,
  context: {
    entityName: 'todo' | 'category' | 'tag'
    operation: 'create' | 'update' | 'delete' | 'fetch'
  }
): ReturnType<typeof createError> | null {
  if (!isPrismaError(error)) {
    return null
  }

  const { entityName, operation } = context
  const errorCode = error.code

  // Map entity names to error code prefixes
  const errorPrefix = entityName.toUpperCase() as 'TODO' | 'CATEGORY' | 'TAG'

  switch (errorCode) {
    // Unique constraint violation
    case 'P2002': {
      const field = error.meta?.target?.[0]
      if (field === 'name' || field === 'title') {
        return conflict(`${errorPrefix}_EXISTS` as ErrorCode)
      }
      return conflict('UNIQUE_CONSTRAINT_VIOLATION')
    }

    // Foreign key constraint violation
    case 'P2003': {
      const fieldName = error.meta?.field_name
      if (fieldName?.includes('category')) {
        return notFound('CATEGORY_NOT_FOUND')
      }
      if (fieldName?.includes('tag')) {
        return notFound('TAG_NOT_FOUND')
      }
      if (fieldName?.includes('user')) {
        return notFound('AUTH_USER_NOT_FOUND')
      }
      return badRequest('FOREIGN_KEY_VIOLATION')
    }

    // Record not found for update/delete
    case 'P2025': {
      return notFound(`${errorPrefix}_NOT_FOUND` as ErrorCode)
    }

    // Value too long
    case 'P2000': {
      const field = error.meta?.target?.[0]
      if (field === 'title') {
        return badRequest('TODO_TITLE_TOO_LONG')
      }
      if (field === 'description') {
        return badRequest('TODO_DESCRIPTION_TOO_LONG')
      }
      if (field === 'name' && entityName === 'category') {
        return badRequest('CATEGORY_NAME_TOO_LONG')
      }
      if (field === 'name' && entityName === 'tag') {
        return badRequest('TAG_NAME_TOO_LONG')
      }
      return badRequest('STRING_TOO_LONG')
    }

    // Connection errors
    case 'P1001':
    case 'P1002':
    case 'P2024': {
      console.error(`Database connection error (${errorCode}):`, error)
      return serverError('DATABASE_CONNECTION_ERROR')
    }

    // Default: return operation-specific error
    default: {
      console.error(`Prisma error (${errorCode}) during ${operation} on ${entityName}:`, error)
      const operationErrorMap: Record<string, ErrorCode> = {
        'create': `${errorPrefix}_CREATE_ERROR` as ErrorCode,
        'update': `${errorPrefix}_UPDATE_ERROR` as ErrorCode,
        'delete': `${errorPrefix}_DELETE_ERROR` as ErrorCode,
        'fetch': `${errorPrefix}_FETCH_ERROR` as ErrorCode,
      }
      return serverError(operationErrorMap[operation] || 'SERVER_ERROR')
    }
  }
}
