/**
 * Utilitaires de pagination
 * Centralise la logique de pagination pour toutes les ressources
 */

import type { H3Event } from 'h3'
import type { PaginationMeta } from '~/types/api'

/** Configuration de pagination par défaut */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 5,  // 5 items par page pour démontrer la pagination
  maxLimit: 100,
  minLimit: 1
} as const

/** Options de pagination parsées */
export interface ParsedPagination {
  page: number
  limit: number
  skip: number
}

/**
 * Parse les paramètres de pagination depuis une requête H3
 */
export function parsePaginationParams(event: H3Event): ParsedPagination {
  const query = getQuery(event)

  const page = Math.max(
    PAGINATION_DEFAULTS.page,
    parseInt(query.page as string) || PAGINATION_DEFAULTS.page
  )

  const limit = Math.min(
    PAGINATION_DEFAULTS.maxLimit,
    Math.max(
      PAGINATION_DEFAULTS.minLimit,
      parseInt(query.limit as string) || PAGINATION_DEFAULTS.limit
    )
  )

  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Crée les métadonnées de pagination
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

/**
 * Parse les paramètres de tri depuis une requête H3
 */
export function parseSortParams(
  event: H3Event,
  allowedFields: string[],
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  const query = getQuery(event)

  const sortBy = query.sortBy as string
  const sortOrder = query.sortOrder as string

  const field = allowedFields.includes(sortBy) ? sortBy : defaultField
  const order = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : defaultOrder

  return { [field]: order }
}

/**
 * Parse un paramètre de recherche
 */
export function parseSearchParam(event: H3Event, paramName: string = 'search'): string | undefined {
  const query = getQuery(event)
  const search = query[paramName]

  if (typeof search === 'string' && search.trim()) {
    return search.trim()
  }

  return undefined
}

/**
 * Parse un paramètre enum depuis une requête
 */
export function parseEnumParam<T extends string>(
  event: H3Event,
  paramName: string,
  allowedValues: readonly T[]
): T | undefined {
  const query = getQuery(event)
  const value = query[paramName] as string

  if (allowedValues.includes(value as T)) {
    return value as T
  }

  return undefined
}

/**
 * Parse un paramètre booléen depuis une requête
 */
export function parseBooleanParam(
  event: H3Event,
  paramName: string
): boolean | undefined {
  const query = getQuery(event)
  const value = query[paramName]

  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false

  return undefined
}

/**
 * Parse un paramètre ID (string non vide)
 */
export function parseIdParam(
  event: H3Event,
  paramName: string
): string | undefined {
  const query = getQuery(event)
  const value = query[paramName]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return undefined
}
