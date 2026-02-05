/**
 * CategoryResource - Ressource Category avec authentification
 *
 * Gère toutes les opérations CRUD pour les catégories avec:
 * - Isolation des données par utilisateur
 * - Compteur de todos associés
 * - Validation d'unicité du nom (par utilisateur)
 * - Sérialisation automatique
 * - Server-side caching for getAll (categories rarely change)
 */

import type { H3Event } from 'h3'
import type { Prisma, Category as PrismaCategory } from '~/generated/prisma/index.js'
import type { Category, CategoryWithCount } from '~/types/todo'
import type { ApiResponse } from '~/types/api'
import type { CreateCategoryDTO, UpdateCategoryDTO } from '~/types/todo'
import { badRequest, notFound, conflict, serverError, handlePrismaError } from '~/server/utils/errors'
import { serializeCategory } from '~/server/utils/serializers'
import { requireAuth, getCurrentUserId } from '~/server/utils/authMiddleware'
import { cache, CacheKeys, CacheTTL } from '~/server/utils/cache'

// ============================================
// TYPES
// ============================================

type CategoryWithCountPrisma = PrismaCategory & {
  _count: { todos: number }
}

// ============================================
// HELPERS
// ============================================

/**
 * Validate category name is unique for user
 */
async function validateNameUnique(name: string, userId: string, excludeId?: string): Promise<void> {
  try {
    const prisma = usePrisma()
    const existing = await prisma.category.findFirst({
      where: {
        name,
        userId,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    })

    if (existing) {
      throw conflict('CATEGORY_EXISTS')
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error validating category name uniqueness:', error)
    throw serverError('CATEGORY_FETCH_ERROR')
  }
}

/**
 * Validate category exists and belongs to user
 */
async function validateCategoryBelongsToUser(categoryId: string, userId: string): Promise<void> {
  try {
    const prisma = usePrisma()
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId }
    })

    if (!category) {
      throw notFound('CATEGORY_NOT_FOUND')
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error validating category ownership:', error)
    throw serverError('CATEGORY_FETCH_ERROR')
  }
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * GET all categories with todo count
 * Requires authentication - returns only user's categories
 * Cached with user-specific key (categories rarely change)
 */
async function getAllWithCount(event: H3Event): Promise<ApiResponse<CategoryWithCount[]>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  // Check cache first
  const cacheKey = cache.key(CacheKeys.CATEGORIES, userId)
  const cached = cache.get<CategoryWithCount[]>(cacheKey)

  if (cached) {
    return {
      success: true,
      data: cached
    }
  }

  try {
    const prisma = usePrisma()
    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { todos: true }
        }
      },
      orderBy: { name: 'asc' }
    }) as CategoryWithCountPrisma[]

    const data: CategoryWithCount[] = categories.map(({ _count, ...rest }) => ({
      ...serializeCategory(rest),
      todosCount: _count.todos
    }))

    // Cache the result
    cache.set(cacheKey, data, CacheTTL.CATEGORIES)

    return {
      success: true,
      data
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching categories:', error)
    throw serverError('CATEGORY_FETCH_ERROR')
  }
}

/**
 * CREATE category
 * Requires authentication - associates with user
 */
async function create(event: H3Event): Promise<ApiResponse<Category>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const body = await readBody<CreateCategoryDTO>(event)

  // Validation
  if (!body.name?.trim()) {
    throw badRequest('CATEGORY_NAME_REQUIRED')
  }
  if (body.name.trim().length > 100) {
    throw badRequest('CATEGORY_NAME_TOO_LONG')
  }
  if (!body.color) {
    throw badRequest('COLOR_REQUIRED')
  }

  const name = body.name.trim()

  // Validate name is unique for user
  await validateNameUnique(name, userId)

  try {
    const prisma = usePrisma()
    const category = await prisma.category.create({
      data: {
        name,
        color: body.color,
        icon: body.icon || null,
        userId
      }
    })

    // Invalidate cache after creating
    cache.invalidate(cache.key(CacheKeys.CATEGORIES, userId))

    return {
      success: true,
      data: serializeCategory(category)
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'create' })
    if (prismaError) throw prismaError
    console.error('Error creating category:', error)
    throw serverError('CATEGORY_CREATE_ERROR')
  }
}

/**
 * GET delete info - returns todo count for category
 * Requires authentication - validates ownership
 */
async function getDeleteInfo(event: H3Event): Promise<ApiResponse<{ todosCount: number }>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('CATEGORY_ID_REQUIRED')
  }

  // Validate ownership
  await validateCategoryBelongsToUser(id, userId)

  try {
    const prisma = usePrisma()
    const count = await prisma.todo.count({
      where: { categories: { some: { id } }, userId }
    })

    return {
      success: true,
      data: { todosCount: count }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching category delete info:', error)
    throw serverError('CATEGORY_FETCH_ERROR')
  }
}

/**
 * UPDATE category
 * Requires authentication - validates ownership
 */
async function update(event: H3Event): Promise<ApiResponse<Category>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('CATEGORY_ID_REQUIRED')
  }

  // Validate ownership
  await validateCategoryBelongsToUser(id, userId)

  const body = await readBody<UpdateCategoryDTO>(event)

  // If changing name, validate length and uniqueness
  if (body.name) {
    if (body.name.trim().length > 100) {
      throw badRequest('CATEGORY_NAME_TOO_LONG')
    }
    const name = body.name.trim()
    await validateNameUnique(name, userId, id)
  }

  const updateData: Prisma.CategoryUpdateInput = {}

  if (body.name) updateData.name = body.name.trim()
  if (body.color) updateData.color = body.color
  if (body.icon !== undefined) updateData.icon = body.icon || null

  try {
    const prisma = usePrisma()
    const category = await prisma.category.update({
      where: { id },
      data: updateData
    })

    // Invalidate cache after updating
    cache.invalidate(cache.key(CacheKeys.CATEGORIES, userId))

    return {
      success: true,
      data: serializeCategory(category)
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'update' })
    if (prismaError) throw prismaError
    console.error('Error updating category:', error)
    throw serverError('CATEGORY_UPDATE_ERROR')
  }
}

/**
 * DELETE category (cascades to todos)
 * Requires authentication - validates ownership
 */
async function deleteCategory(event: H3Event): Promise<ApiResponse<{ deleted: boolean }>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('CATEGORY_ID_REQUIRED')
  }

  // Validate ownership
  await validateCategoryBelongsToUser(id, userId)

  try {
    const prisma = usePrisma()
    await prisma.category.delete({ where: { id } })

    // Invalidate cache after deleting
    cache.invalidate(cache.key(CacheKeys.CATEGORIES, userId))

    return {
      success: true,
      data: { deleted: true }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'category', operation: 'delete' })
    if (prismaError) throw prismaError
    console.error('Error deleting category:', error)
    throw serverError('CATEGORY_DELETE_ERROR')
  }
}

// ============================================
// EXPORT
// ============================================

export const CategoryResource = {
  getAllWithCount,
  create,
  getDeleteInfo,
  update,
  delete: deleteCategory
}
