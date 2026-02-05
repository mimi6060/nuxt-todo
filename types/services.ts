/**
 * Types pour les services
 */

import type { PaginationMeta } from './api'

/**
 * Résultat paginé générique
 */
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Paramètres de pagination
 */
export interface PaginationParams {
  page?: number
  limit?: number
  [key: string]: string | number | undefined
}

/**
 * Interface générique pour les opérations CRUD
 * Supporte les résultats paginés
 */
export interface CrudService<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  getAll(params?: PaginationParams): Promise<T[] | PaginatedResult<T>>
  getById(id: string): Promise<T | null>
  create(data: CreateDTO): Promise<T | null>
  update(id: string, data: UpdateDTO): Promise<T | null>
  delete(id: string): Promise<boolean>
}

/**
 * Options pour les composables de ressources
 */
export interface UseResourceOptions<T> {
  /** Fonction pour identifier un élément (default: item.id) */
  getId?: (item: T) => string
  /** Charger automatiquement au montage */
  autoLoad?: boolean
  /** Activer la pagination */
  paginated?: boolean
  /** Clés i18n pour les messages d'erreur */
  errorKeys?: {
    fetch?: string
    create?: string
    update?: string
    delete?: string
    timeout?: string
  }
}
