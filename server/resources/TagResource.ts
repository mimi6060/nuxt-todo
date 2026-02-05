/**
 * TagResource - Gestion des tags avec authentification
 *
 * Tags sont maintenant stockés comme entité séparée avec relation many-to-many avec Todo.
 * Cette ressource fournit des opérations pour:
 * - Lister tous les tags de l'utilisateur
 * - Rechercher des tags (autocomplete)
 * - Statistiques sur l'utilisation des tags
 * - Créer, renommer, supprimer des tags
 *
 * Server-side caching for getAll and getSuggestions
 */

import type { H3Event } from 'h3'
import type { ApiResponse } from '~/types/api'
import type { Tag } from '~/types/todo'
import { parseSearchParam } from '~/server/utils/pagination'
import { badRequest, notFound, conflict, serverError, handlePrismaError } from '~/server/utils/errors'
import { requireAuth, getCurrentUserId } from '~/server/utils/authMiddleware'
import { serializeTag } from '~/server/utils/serializers'
import { cache, CacheKeys, CacheTTL } from '~/server/utils/cache'

// ============================================
// TYPES
// ============================================

export interface TagWithCount extends Tag {
  todosCount: number
}

export interface TagSuggestion {
  id: string
  name: string
  color: string | null
  count: number
}

// ============================================
// HELPERS
// ============================================

/**
 * Invalidate all tag-related caches for a user
 * Called after create, update, delete, and merge operations
 */
function invalidateTagCaches(userId: string): void {
  // Invalidate main tags cache
  cache.invalidate(cache.key(CacheKeys.TAGS, userId))

  // Invalidate all tag suggestions caches for this user (different search queries)
  cache.invalidatePattern(`${CacheKeys.TAG_SUGGESTIONS}:${userId}`)
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * GET all tags with usage count
 * Requires authentication - returns only user's tags
 * Cached with user-specific key
 */
async function getAll(event: H3Event): Promise<ApiResponse<TagWithCount[]>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)
  const prisma = usePrisma()

  // Check cache first
  const cacheKey = cache.key(CacheKeys.TAGS, userId)
  const cached = cache.get<TagWithCount[]>(cacheKey)

  if (cached) {
    return {
      success: true,
      data: cached
    }
  }

  try {
    const tags = await prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { todos: true }
        }
      },
      orderBy: [
        { todos: { _count: 'desc' } },
        { name: 'asc' }
      ]
    })

    const data = tags.map(tag => ({
      ...serializeTag(tag),
      todosCount: tag._count.todos
    }))

    // Cache the result
    cache.set(cacheKey, data, CacheTTL.TAGS)

    return {
      success: true,
      data
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching tags:', error)
    throw serverError('TAG_FETCH_ERROR')
  }
}

/**
 * GET tags for autocomplete/suggestions
 * Requires authentication - returns only user's tags
 * Cached with user-specific key and search query
 */
async function getSuggestions(event: H3Event): Promise<ApiResponse<TagSuggestion[]>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)
  const prisma = usePrisma()
  const search = parseSearchParam(event) || ''

  // Check cache first (include search in key for different results)
  const cacheKey = cache.key(CacheKeys.TAG_SUGGESTIONS, userId, search || 'all')
  const cached = cache.get<TagSuggestion[]>(cacheKey)

  if (cached) {
    return {
      success: true,
      data: cached
    }
  }

  try {
    const tags = await prisma.tag.findMany({
      where: {
        userId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' }
        })
      },
      include: {
        _count: {
          select: { todos: true }
        }
      },
      orderBy: [
        { todos: { _count: 'desc' } },
        { name: 'asc' }
      ],
      take: 10
    })

    const data = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      count: tag._count.todos
    }))

    // Cache the result with shorter TTL (suggestions change with search)
    cache.set(cacheKey, data, CacheTTL.TAG_SUGGESTIONS)

    return {
      success: true,
      data
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching tag suggestions:', error)
    throw serverError('TAG_FETCH_ERROR')
  }
}

/**
 * GET tag statistics
 * Requires authentication - returns only user's stats
 */
async function getStats(event: H3Event): Promise<ApiResponse<{
  totalTags: number
  totalUsage: number
  mostUsed: TagSuggestion[]
  leastUsed: TagSuggestion[]
}>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)
  const prisma = usePrisma()

  try {
    const tags = await prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { todos: true }
        }
      },
      orderBy: { todos: { _count: 'desc' } }
    })

    const tagData = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      count: tag._count.todos
    }))

    const totalUsage = tagData.reduce((sum, t) => sum + t.count, 0)

    return {
      success: true,
      data: {
        totalTags: tags.length,
        totalUsage,
        mostUsed: tagData.slice(0, 5),
        leastUsed: tagData.slice(-5).reverse()
      }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching tag stats:', error)
    throw serverError('TAG_FETCH_ERROR')
  }
}

/**
 * CREATE a new tag
 * Requires authentication
 */
async function create(event: H3Event): Promise<ApiResponse<Tag>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const body = await readBody<{ name: string; color?: string }>(event)

  if (!body.name?.trim()) {
    throw badRequest('TAG_NAME_REQUIRED')
  }
  if (body.name.trim().length > 50) {
    throw badRequest('TAG_NAME_TOO_LONG')
  }

  const name = body.name.trim().toLowerCase()
  const prisma = usePrisma()

  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        color: body.color || null,
        userId
      }
    })

    // Invalidate tag caches for this user
    invalidateTagCaches(userId)

    return {
      success: true,
      data: serializeTag(tag)
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'create' })
    if (prismaError) throw prismaError
    console.error('Error creating tag:', error)
    throw serverError('TAG_CREATE_ERROR')
  }
}

/**
 * UPDATE/rename a tag
 * Requires authentication - validates ownership
 */
async function update(event: H3Event): Promise<ApiResponse<Tag>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('TAG_ID_REQUIRED')
  }

  const body = await readBody<{ name?: string; color?: string }>(event)
  const prisma = usePrisma()

  // Check ownership
  try {
    const existing = await prisma.tag.findFirst({
      where: { id, userId }
    })

    if (!existing) {
      throw notFound('TAG_NOT_FOUND')
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error checking tag ownership:', error)
    throw serverError('TAG_FETCH_ERROR')
  }

  // Validate name length
  if (body.name !== undefined && body.name.trim().length > 50) {
    throw badRequest('TAG_NAME_TOO_LONG')
  }

  try {
    const updateData: { name?: string; color?: string } = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim().toLowerCase()
    }
    if (body.color !== undefined) {
      updateData.color = body.color
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData
    })

    // Invalidate tag caches for this user
    invalidateTagCaches(userId)

    return {
      success: true,
      data: serializeTag(tag)
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'update' })
    if (prismaError) throw prismaError
    console.error('Error updating tag:', error)
    throw serverError('TAG_UPDATE_ERROR')
  }
}

/**
 * DELETE a tag
 * Requires authentication - validates ownership
 * The tag will be disconnected from all todos automatically
 */
async function remove(event: H3Event): Promise<ApiResponse<{ deleted: boolean }>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('TAG_ID_REQUIRED')
  }

  const prisma = usePrisma()

  // Check ownership
  try {
    const existing = await prisma.tag.findFirst({
      where: { id, userId }
    })

    if (!existing) {
      throw notFound('TAG_NOT_FOUND')
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error checking tag ownership:', error)
    throw serverError('TAG_FETCH_ERROR')
  }

  try {
    await prisma.tag.delete({ where: { id } })

    // Invalidate tag caches for this user
    invalidateTagCaches(userId)

    return {
      success: true,
      data: { deleted: true }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'delete' })
    if (prismaError) throw prismaError
    console.error('Error deleting tag:', error)
    throw serverError('TAG_DELETE_ERROR')
  }
}

/**
 * MERGE multiple tags into one
 * Requires authentication - validates ownership
 */
async function merge(event: H3Event): Promise<ApiResponse<{ updated: number }>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const body = await readBody<{ sourceTagIds: string[]; targetTagId: string }>(event)

  if (!body.sourceTagIds?.length || !body.targetTagId) {
    throw badRequest('VALIDATION_FAILED')
  }

  const prisma = usePrisma()

  // Verify all tags belong to user
  try {
    const allTagIds = [...body.sourceTagIds, body.targetTagId]
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: allTagIds },
        userId
      }
    })

    if (tags.length !== allTagIds.length) {
      throw notFound('TAG_NOT_FOUND')
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error verifying tag ownership:', error)
    throw serverError('TAG_FETCH_ERROR')
  }

  try {
    let totalUpdated = 0

    await prisma.$transaction(async (tx) => {
      for (const sourceTagId of body.sourceTagIds) {
        if (sourceTagId === body.targetTagId) continue

        // Get todos with source tag
        const todosWithSourceTag = await tx.todo.findMany({
          where: {
            tags: { some: { id: sourceTagId } },
            userId
          },
          select: { id: true }
        })

        // Connect target tag to these todos (if not already connected)
        for (const todo of todosWithSourceTag) {
          await tx.todo.update({
            where: { id: todo.id },
            data: {
              tags: {
                connect: { id: body.targetTagId },
                disconnect: { id: sourceTagId }
              }
            }
          })
          totalUpdated++
        }

        // Delete source tag
        await tx.tag.delete({ where: { id: sourceTagId } })
      }
    })

    // Invalidate tag caches for this user
    invalidateTagCaches(userId)

    return {
      success: true,
      data: { updated: totalUpdated }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'update' })
    if (prismaError) throw prismaError
    console.error('Error merging tags:', error)
    throw serverError('TAG_MERGE_ERROR')
  }
}

// ============================================
// EXPORT
// ============================================

export const TagResource = {
  getAll,
  getSuggestions,
  getStats,
  create,
  update,
  remove,
  merge
}
