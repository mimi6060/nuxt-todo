/**
 * GenericResource - Factory pour créer des ressources CRUD génériques
 *
 * Fournit une abstraction complète pour les opérations CRUD avec:
 * - Pagination automatique
 * - Filtrage dynamique
 * - Relations (include)
 * - Soft delete (optionnel)
 * - Sérialisation automatique des dates
 * - Hooks (beforeCreate, afterUpdate, etc.)
 * - Validation centralisée
 */

import type { H3Event } from 'h3'
import type { ApiResponse, PaginationMeta } from '~/types/api'
import type { ErrorCode } from './errors'
import { badRequest, notFound, conflict, serverError } from './errors'

// ============================================
// TYPES
// ============================================

/** Configuration d'une ressource générique */
export interface ResourceConfig<T, CreateDTO, UpdateDTO> {
  /** Nom du modèle Prisma (lowercase) */
  modelName: string

  /** Codes d'erreur personnalisés */
  errorCodes: {
    idRequired: ErrorCode
    notFound: ErrorCode
    createFailed?: ErrorCode
    updateFailed?: ErrorCode
    deleteFailed?: ErrorCode
  }

  /** Configuration du soft delete */
  softDelete?: {
    enabled: boolean
    field: string // ex: 'deletedAt'
  }

  /** Champs à inclure par défaut dans les requêtes */
  defaultInclude?: Record<string, boolean | object>

  /** Tri par défaut */
  defaultOrderBy?: Record<string, 'asc' | 'desc'>

  /** Sérialiseur personnalisé (convertit les dates en ISO strings, etc.) */
  serializer?: (entity: unknown) => T

  /** Hooks pour intercepter les opérations */
  hooks?: {
    beforeCreate?: (data: CreateDTO, event: H3Event) => Promise<CreateDTO | void>
    afterCreate?: (entity: T, event: H3Event) => Promise<void>
    beforeUpdate?: (id: string, data: UpdateDTO, event: H3Event) => Promise<UpdateDTO | void>
    afterUpdate?: (entity: T, event: H3Event) => Promise<void>
    beforeDelete?: (id: string, event: H3Event) => Promise<void>
    afterDelete?: (id: string, event: H3Event) => Promise<void>
  }

  /** Validateurs personnalisés */
  validators?: {
    create?: (data: CreateDTO) => Promise<void> | void
    update?: (id: string, data: UpdateDTO) => Promise<void> | void
  }
}

/** Options pour getAll avec pagination et filtres */
export interface GetAllOptions {
  page?: number
  limit?: number
  where?: Record<string, unknown>
  include?: Record<string, boolean | object>
  orderBy?: Record<string, 'asc' | 'desc'>
  search?: {
    fields: string[]
    query: string
  }
}

/** Options pour getById */
export interface GetByIdOptions {
  include?: Record<string, boolean | object>
}

/** Réponse paginée */
export interface PaginatedData<T> {
  data: T[]
  meta: PaginationMeta
}

/** Interface de la ressource générée */
export interface GenericResourceInstance<T, CreateDTO, UpdateDTO> {
  // CRUD de base
  getAll: (options?: GetAllOptions) => Promise<ApiResponse<T[]>>
  getAllPaginated: (event: H3Event, options?: Omit<GetAllOptions, 'page' | 'limit'>) => Promise<ApiResponse<PaginatedData<T>>>
  getById: (event: H3Event, options?: GetByIdOptions) => Promise<ApiResponse<T>>
  create: (event: H3Event) => Promise<ApiResponse<T>>
  update: (event: H3Event) => Promise<ApiResponse<T>>
  delete: (event: H3Event) => Promise<ApiResponse<{ deleted: boolean }>>

  // Helpers
  findById: (id: string, include?: Record<string, boolean | object>) => Promise<T | null>
  findByIdOrThrow: (id: string, include?: Record<string, boolean | object>) => Promise<T>
  count: (where?: Record<string, unknown>) => Promise<number>
  exists: (id: string) => Promise<boolean>

  // Accès direct au modèle Prisma (pour cas spécifiques)
  getModel: () => unknown

  // Config
  config: ResourceConfig<T, CreateDTO, UpdateDTO>
}

// ============================================
// FACTORY
// ============================================

/**
 * Crée une ressource CRUD générique
 *
 * @example
 * ```ts
 * const TodoResource = createGenericResource<Todo, CreateTodoDTO, UpdateTodoDTO>({
 *   modelName: 'todo',
 *   errorCodes: { idRequired: 'TODO_ID_REQUIRED', notFound: 'TODO_NOT_FOUND' },
 *   defaultInclude: { category: true },
 *   serializer: serializeTodo,
 * })
 * ```
 */
export function createGenericResource<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>(
  config: ResourceConfig<T, CreateDTO, UpdateDTO>
): GenericResourceInstance<T, CreateDTO, UpdateDTO> {

  // Accès au modèle Prisma
  const getModel = () => {
    const prisma = usePrisma() as unknown as Record<string, unknown>
    const model = prisma[config.modelName]
    if (!model) {
      throw serverError('SERVER_ERROR')
    }
    return model as {
      findMany: (args?: unknown) => Promise<unknown[]>
      findUnique: (args: unknown) => Promise<unknown | null>
      create: (args: unknown) => Promise<unknown>
      update: (args: unknown) => Promise<unknown>
      delete: (args: unknown) => Promise<unknown>
      count: (args?: unknown) => Promise<number>
    }
  }

  // Sérialisation
  const serialize = (entity: unknown): T => {
    if (config.serializer) {
      return config.serializer(entity)
    }
    // Sérialisation automatique des dates
    return serializeEntity(entity) as T
  }

  const serializeMany = (entities: unknown[]): T[] => {
    return entities.map(serialize)
  }

  // Extraction de l'ID depuis l'event
  const extractId = (event: H3Event): string => {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw badRequest(config.errorCodes.idRequired)
    }
    return id
  }

  // Construction du where avec soft delete
  const buildWhere = (where?: Record<string, unknown>): Record<string, unknown> => {
    const baseWhere = { ...where }

    if (config.softDelete?.enabled) {
      baseWhere[config.softDelete.field] = null
    }

    return baseWhere
  }

  // Construction du where avec recherche textuelle
  const buildSearchWhere = (
    baseWhere: Record<string, unknown>,
    search?: { fields: string[]; query: string }
  ): Record<string, unknown> => {
    if (!search || !search.query.trim()) {
      return baseWhere
    }

    const searchConditions = search.fields.map(field => ({
      [field]: { contains: search.query, mode: 'insensitive' }
    }))

    return {
      ...baseWhere,
      OR: searchConditions
    }
  }

  // Pagination
  const parsePagination = (event: H3Event): { page: number; limit: number; skip: number } => {
    const query = getQuery(event)
    const page = Math.max(1, parseInt(query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
    const skip = (page - 1) * limit
    return { page, limit, skip }
  }

  // ============================================
  // IMPLEMENTATION
  // ============================================

  const resource: GenericResourceInstance<T, CreateDTO, UpdateDTO> = {
    config,
    getModel,

    // GET ALL (sans pagination)
    async getAll(options?: GetAllOptions): Promise<ApiResponse<T[]>> {
      const where = buildSearchWhere(
        buildWhere(options?.where),
        options?.search
      )

      const entities = await getModel().findMany({
        where,
        include: options?.include ?? config.defaultInclude,
        orderBy: options?.orderBy ?? config.defaultOrderBy,
      })

      return {
        success: true,
        data: serializeMany(entities)
      }
    },

    // GET ALL avec pagination
    async getAllPaginated(
      event: H3Event,
      options?: Omit<GetAllOptions, 'page' | 'limit'>
    ): Promise<ApiResponse<PaginatedData<T>>> {
      const { page, limit, skip } = parsePagination(event)

      const where = buildSearchWhere(
        buildWhere(options?.where),
        options?.search
      )

      const [entities, total] = await Promise.all([
        getModel().findMany({
          where,
          include: options?.include ?? config.defaultInclude,
          orderBy: options?.orderBy ?? config.defaultOrderBy,
          skip,
          take: limit,
        }),
        getModel().count({ where })
      ])

      return {
        success: true,
        data: {
          data: serializeMany(entities),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      }
    },

    // GET BY ID
    async getById(event: H3Event, options?: GetByIdOptions): Promise<ApiResponse<T>> {
      const id = extractId(event)
      const entity = await resource.findByIdOrThrow(id, options?.include)

      return {
        success: true,
        data: entity
      }
    },

    // CREATE
    async create(event: H3Event): Promise<ApiResponse<T>> {
      let data = await readBody<CreateDTO>(event)

      // Validation personnalisée
      if (config.validators?.create) {
        await config.validators.create(data)
      }

      // Hook beforeCreate
      if (config.hooks?.beforeCreate) {
        const modified = await config.hooks.beforeCreate(data, event)
        if (modified) data = modified
      }

      const entity = await getModel().create({
        data,
        include: config.defaultInclude
      })

      const serialized = serialize(entity)

      // Hook afterCreate
      if (config.hooks?.afterCreate) {
        await config.hooks.afterCreate(serialized, event)
      }

      return {
        success: true,
        data: serialized
      }
    },

    // UPDATE
    async update(event: H3Event): Promise<ApiResponse<T>> {
      const id = extractId(event)
      let data = await readBody<UpdateDTO>(event)

      // Vérifier existence
      await resource.findByIdOrThrow(id)

      // Validation personnalisée
      if (config.validators?.update) {
        await config.validators.update(id, data)
      }

      // Hook beforeUpdate
      if (config.hooks?.beforeUpdate) {
        const modified = await config.hooks.beforeUpdate(id, data, event)
        if (modified) data = modified
      }

      const entity = await getModel().update({
        where: { id },
        data,
        include: config.defaultInclude
      })

      const serialized = serialize(entity)

      // Hook afterUpdate
      if (config.hooks?.afterUpdate) {
        await config.hooks.afterUpdate(serialized, event)
      }

      return {
        success: true,
        data: serialized
      }
    },

    // DELETE
    async delete(event: H3Event): Promise<ApiResponse<{ deleted: boolean }>> {
      const id = extractId(event)

      // Vérifier existence
      await resource.findByIdOrThrow(id)

      // Hook beforeDelete
      if (config.hooks?.beforeDelete) {
        await config.hooks.beforeDelete(id, event)
      }

      if (config.softDelete?.enabled) {
        // Soft delete
        await getModel().update({
          where: { id },
          data: { [config.softDelete.field]: new Date() }
        })
      } else {
        // Hard delete
        await getModel().delete({ where: { id } })
      }

      // Hook afterDelete
      if (config.hooks?.afterDelete) {
        await config.hooks.afterDelete(id, event)
      }

      return {
        success: true,
        data: { deleted: true }
      }
    },

    // HELPERS
    async findById(id: string, include?: Record<string, boolean | object>): Promise<T | null> {
      const where = buildWhere({ id })

      const entity = await getModel().findUnique({
        where,
        include: include ?? config.defaultInclude
      })

      return entity ? serialize(entity) : null
    },

    async findByIdOrThrow(id: string, include?: Record<string, boolean | object>): Promise<T> {
      const entity = await resource.findById(id, include)

      if (!entity) {
        throw notFound(config.errorCodes.notFound)
      }

      return entity
    },

    async count(where?: Record<string, unknown>): Promise<number> {
      return await getModel().count({ where: buildWhere(where) })
    },

    async exists(id: string): Promise<boolean> {
      const count = await resource.count({ id })
      return count > 0
    }
  }

  return resource
}

// ============================================
// HELPERS
// ============================================

/**
 * Sérialise une entité en convertissant les dates en ISO strings
 */
export function serializeEntity<T>(entity: unknown): T {
  if (entity === null || entity === undefined) {
    return entity as T
  }

  if (entity instanceof Date) {
    return entity.toISOString() as T
  }

  if (Array.isArray(entity)) {
    return entity.map(item => serializeEntity(item)) as T
  }

  if (typeof entity === 'object') {
    const serialized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(entity as Record<string, unknown>)) {
      // Skip Prisma internal fields
      if (key.startsWith('_')) continue

      if (value instanceof Date) {
        serialized[key] = value.toISOString()
      } else if (value !== null && typeof value === 'object') {
        serialized[key] = serializeEntity(value)
      } else {
        serialized[key] = value
      }
    }

    return serialized as T
  }

  return entity as T
}

/**
 * Crée un helper pour vérifier l'unicité d'un champ
 */
export function createUniqueValidator(
  modelName: string,
  field: string,
  errorCode: ErrorCode
) {
  return async (value: string, excludeId?: string): Promise<void> => {
    const prisma = usePrisma() as unknown as Record<string, unknown>
    const model = prisma[modelName] as { findUnique: (args: unknown) => Promise<unknown | null> }

    const existing = await model.findUnique({
      where: { [field]: value }
    })

    if (existing && (!excludeId || (existing as { id: string }).id !== excludeId)) {
      throw conflict(errorCode)
    }
  }
}

/**
 * Crée un helper pour vérifier l'existence d'une relation
 */
export function createRelationValidator(
  modelName: string,
  errorCode: ErrorCode
) {
  return async (id: string): Promise<void> => {
    const prisma = usePrisma() as unknown as Record<string, unknown>
    const model = prisma[modelName] as { findUnique: (args: unknown) => Promise<unknown | null> }

    const existing = await model.findUnique({
      where: { id }
    })

    if (!existing) {
      throw notFound(errorCode)
    }
  }
}
