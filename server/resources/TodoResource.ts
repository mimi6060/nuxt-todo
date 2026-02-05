/**
 * TodoResource - Ressource Todo avec authentification
 *
 * Gère toutes les opérations CRUD pour les todos avec:
 * - Isolation des données par utilisateur
 * - Pagination et filtrage avancés
 * - Relations avec Category et Tags
 * - Sérialisation automatique des dates
 * - Validation des données
 */

import type { H3Event } from 'h3'
import type { Prisma } from '~/generated/prisma/index.js'
import type { Todo } from '~/types/todo'
import type { ApiResponse } from '~/types/api'
import type { CreateTodoDTO, UpdateTodoDTO } from '~/types/todo'
import type { PaginatedData } from '~/server/utils/GenericResource'
import { badRequest, notFound, serverError, handlePrismaError } from '~/server/utils/errors'
import { serializeTodo } from '~/server/utils/serializers'
import {
  parsePaginationParams,
  createPaginationMeta,
  parseSearchParam,
  parseEnumParam,
  parseBooleanParam,
  parseIdParam
} from '~/server/utils/pagination'
import { requireAuth, getCurrentUserId } from '~/server/utils/authMiddleware'

// Default include for all Todo queries
const DEFAULT_INCLUDE = {
  categories: true,  // Many-to-many
  tags: true         // Many-to-many
}

// ============================================
// HELPERS
// ============================================

/**
 * Validate that all categories exist AND belong to user
 */
async function validateCategoriesBelongToUser(categoryIds: string[], userId: string): Promise<void> {
  if (!categoryIds || categoryIds.length === 0) return

  try {
    const prisma = usePrisma()
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, userId }
    })

    if (categories.length !== categoryIds.length) {
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

/**
 * Validate that todo exists AND belongs to user
 */
async function validateTodoBelongsToUser(todoId: string, userId: string): Promise<void> {
  try {
    const prisma = usePrisma()
    const todo = await prisma.todo.findFirst({
      where: { id: todoId, userId }
    })

    if (!todo) {
      throw notFound('TODO_NOT_FOUND')
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'todo', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error validating todo ownership:', error)
    throw serverError('TODO_FETCH_ERROR')
  }
}

/**
 * Get or create tags for a user
 * Returns tag IDs to connect to todo
 */
async function getOrCreateTags(tagNames: string[], userId: string): Promise<{ id: string }[]> {
  if (!tagNames || tagNames.length === 0) return []

  const prisma = usePrisma()
  const normalizedNames = tagNames
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)

  // Validate tag name lengths
  for (const name of normalizedNames) {
    if (name.length > 50) {
      throw badRequest('TAG_NAME_TOO_LONG')
    }
  }

  // Remove duplicates
  const uniqueNames = [...new Set(normalizedNames)]

  const tagConnections: { id: string }[] = []

  try {
    for (const name of uniqueNames) {
      // Try to find existing tag or create new one
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: { userId, name }
        },
        update: {}, // No update needed
        create: {
          name,
          userId
        }
      })
      tagConnections.push({ id: tag.id })
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'tag', operation: 'create' })
    if (prismaError) throw prismaError
    console.error('Error creating tags:', error)
    throw serverError('TAG_CREATE_ERROR')
  }

  return tagConnections
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Priority order for sorting (higher = more urgent)
 */
const PRIORITY_SORT_ORDER: Record<string, number> = {
  'LOW': 1,
  'MEDIUM': 2,
  'HIGH': 3,
  'URGENT': 4
}

/**
 * GET all todos with filters, sorting, and pagination
 * Requires authentication - returns only user's todos
 */
async function getAllWithFilters(event: H3Event): Promise<ApiResponse<PaginatedData<Todo>>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)
  const { page, limit, skip } = parsePaginationParams(event)

  // Build where clause with userId filter
  const where: Prisma.TodoWhereInput = { userId }

  // Status filter
  const status = parseEnumParam(event, 'status', ['completed', 'active'] as const)
  if (status === 'completed') {
    where.completed = true
  } else if (status === 'active') {
    where.completed = false
  }

  // Category filter (many-to-many)
  const categoryId = parseIdParam(event, 'categoryId')
  if (categoryId) {
    where.categories = { some: { id: categoryId } }
  }

  // Priority filter
  const priority = parseEnumParam(event, 'priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)
  if (priority) {
    where.priority = priority
  }

  // Tag filter
  const tagId = parseIdParam(event, 'tagId')
  if (tagId) {
    where.tags = { some: { id: tagId } }
  }

  // Text search (includes tags)
  const search = parseSearchParam(event)
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { some: { name: { contains: search, mode: 'insensitive' } } } }
    ]
  }

  // Overdue filter
  const overdue = parseBooleanParam(event, 'overdue')
  if (overdue) {
    where.completed = false
    where.deadline = { lt: new Date() }
  }

  // Parse sort parameters
  const sortBy = parseEnumParam(event, 'sortBy', ['createdAt', 'deadline', 'priority', 'title'] as const) || 'createdAt'
  const sortOrder = parseEnumParam(event, 'sortOrder', ['asc', 'desc'] as const) || 'desc'

  // Build orderBy clause
  let orderBy: Prisma.TodoOrderByWithRelationInput | Prisma.TodoOrderByWithRelationInput[]

  if (sortBy === 'priority') {
    orderBy = { createdAt: sortOrder }
  } else if (sortBy === 'deadline') {
    orderBy = [
      { deadline: { sort: sortOrder, nulls: 'last' } },
      { createdAt: 'desc' }
    ]
  } else {
    orderBy = { [sortBy]: sortOrder }
  }

  const prisma = usePrisma()

  try {
    // For priority sorting, we need to handle it specially
    if (sortBy === 'priority') {
      const [allTodos, total] = await Promise.all([
        prisma.todo.findMany({
          where,
          include: DEFAULT_INCLUDE
        }),
        prisma.todo.count({ where })
      ])

      // Sort by priority in memory
      const sorted = allTodos.sort((a, b) => {
        const orderA = PRIORITY_SORT_ORDER[a.priority] || 0
        const orderB = PRIORITY_SORT_ORDER[b.priority] || 0
        const diff = sortOrder === 'asc' ? orderA - orderB : orderB - orderA
        if (diff === 0) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return diff
      })

      const paginated = sorted.slice(skip, skip + limit)

      return {
        success: true,
        data: {
          data: paginated.map(t => serializeTodo(t)),
          meta: createPaginationMeta(total, page, limit)
        }
      }
    }

    // Standard query with database sorting
    const [todos, total] = await Promise.all([
      prisma.todo.findMany({
        where,
        include: DEFAULT_INCLUDE,
        orderBy,
        skip,
        take: limit
      }),
      prisma.todo.count({ where })
    ])

    return {
      success: true,
      data: {
        data: todos.map(t => serializeTodo(t)),
        meta: createPaginationMeta(total, page, limit)
      }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'todo', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching todos:', error)
    throw serverError('TODO_FETCH_ERROR')
  }
}

/**
 * GET todo by ID
 * Requires authentication - validates ownership
 */
async function getById(event: H3Event): Promise<ApiResponse<Todo>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('TODO_ID_REQUIRED')
  }

  try {
    const prisma = usePrisma()
    const todo = await prisma.todo.findFirst({
      where: { id, userId },
      include: DEFAULT_INCLUDE
    })

    if (!todo) {
      throw notFound('TODO_NOT_FOUND')
    }

    return {
      success: true,
      data: serializeTodo(todo)
    }
  } catch (error) {
    // Re-throw if it's already an HTTP error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const prismaError = handlePrismaError(error, { entityName: 'todo', operation: 'fetch' })
    if (prismaError) throw prismaError
    console.error('Error fetching todo by ID:', error)
    throw serverError('TODO_FETCH_ERROR')
  }
}

/**
 * CREATE todo
 * Requires authentication - associates with user
 */
async function create(event: H3Event): Promise<ApiResponse<Todo>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const body = await readBody<CreateTodoDTO>(event)

  // Validation
  if (!body.title?.trim()) {
    throw badRequest('TODO_TITLE_REQUIRED')
  }
  if (body.title.trim().length > 200) {
    throw badRequest('TODO_TITLE_TOO_LONG')
  }
  if (body.description && body.description.trim().length > 2000) {
    throw badRequest('TODO_DESCRIPTION_TOO_LONG')
  }
  if (!body.categoryIds || body.categoryIds.length === 0) {
    throw badRequest('TODO_CATEGORY_REQUIRED')
  }

  // Validate deadline if provided
  if (body.deadline) {
    const deadlineDate = new Date(body.deadline)
    if (isNaN(deadlineDate.getTime())) {
      throw badRequest('TODO_INVALID_DEADLINE')
    }
  }

  // Validate priority if provided
  if (body.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority)) {
    throw badRequest('TODO_INVALID_PRIORITY')
  }

  // Validate all categories belong to user
  await validateCategoriesBelongToUser(body.categoryIds, userId)

  // Get or create tags
  const tagConnections = await getOrCreateTags(body.tags || [], userId)

  try {
    const prisma = usePrisma()
    const todo = await prisma.todo.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        priority: body.priority || 'MEDIUM',
        deadline: body.deadline ? new Date(body.deadline) : null,
        userId,
        categories: {
          connect: body.categoryIds.map(id => ({ id }))
        },
        tags: {
          connect: tagConnections
        }
      },
      include: DEFAULT_INCLUDE
    })

    return {
      success: true,
      data: serializeTodo(todo)
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'todo', operation: 'create' })
    if (prismaError) throw prismaError
    console.error('Error creating todo:', error)
    throw serverError('TODO_CREATE_ERROR')
  }
}

/**
 * UPDATE todo
 * Requires authentication - validates ownership
 */
async function update(event: H3Event): Promise<ApiResponse<Todo>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('TODO_ID_REQUIRED')
  }

  // Validate ownership
  await validateTodoBelongsToUser(id, userId)

  const body = await readBody<UpdateTodoDTO>(event)

  // If changing categories, validate all new categories belong to user
  if (body.categoryIds && body.categoryIds.length > 0) {
    await validateCategoriesBelongToUser(body.categoryIds, userId)
  }

  // Validate string lengths
  if (body.title !== undefined && body.title.trim().length > 200) {
    throw badRequest('TODO_TITLE_TOO_LONG')
  }
  if (body.description !== undefined && body.description && body.description.trim().length > 2000) {
    throw badRequest('TODO_DESCRIPTION_TOO_LONG')
  }

  // Validate deadline if provided
  if (body.deadline !== undefined && body.deadline !== null) {
    const deadlineDate = new Date(body.deadline)
    if (isNaN(deadlineDate.getTime())) {
      throw badRequest('TODO_INVALID_DEADLINE')
    }
  }

  // Validate priority if provided
  if (body.priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority)) {
    throw badRequest('TODO_INVALID_PRIORITY')
  }

  // Build update data
  const updateData: Prisma.TodoUpdateInput = {}

  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.description !== undefined) updateData.description = body.description?.trim() || null
  if (body.completed !== undefined) {
    updateData.completed = body.completed
    updateData.completedAt = body.completed ? new Date() : null
  }
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null

  // Handle categories update - replace all categories (many-to-many)
  if (body.categoryIds !== undefined) {
    updateData.categories = {
      set: body.categoryIds.map(id => ({ id }))
    }
  }

  // Handle tags update - replace all tags
  if (body.tags !== undefined) {
    const tagConnections = await getOrCreateTags(body.tags, userId)
    updateData.tags = {
      set: tagConnections  // Replace all existing tags
    }
  }

  try {
    const prisma = usePrisma()
    const todo = await prisma.todo.update({
      where: { id },
      data: updateData,
      include: DEFAULT_INCLUDE
    })

    return {
      success: true,
      data: serializeTodo(todo)
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'todo', operation: 'update' })
    if (prismaError) throw prismaError
    console.error('Error updating todo:', error)
    throw serverError('TODO_UPDATE_ERROR')
  }
}

/**
 * DELETE todo
 * Requires authentication - validates ownership
 */
async function deleteTodo(event: H3Event): Promise<ApiResponse<{ deleted: boolean }>> {
  await requireAuth(event)
  const userId = getCurrentUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequest('TODO_ID_REQUIRED')
  }

  // Validate ownership
  await validateTodoBelongsToUser(id, userId)

  try {
    const prisma = usePrisma()
    await prisma.todo.delete({ where: { id } })

    return {
      success: true,
      data: { deleted: true }
    }
  } catch (error) {
    const prismaError = handlePrismaError(error, { entityName: 'todo', operation: 'delete' })
    if (prismaError) throw prismaError
    console.error('Error deleting todo:', error)
    throw serverError('TODO_DELETE_ERROR')
  }
}

// ============================================
// EXPORT
// ============================================

export const TodoResource = {
  getAllWithFilters,
  getById,
  create,
  update,
  delete: deleteTodo
}
