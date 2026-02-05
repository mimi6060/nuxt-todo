/**
 * Types pour les réponses API
 * Pattern standard pour toutes les réponses de l'API
 */

/**
 * Réponse API générique
 * @template T - Type des données retournées
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Réponse API avec pagination
 * @template T - Type des items dans la liste
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * Erreur API standardisée
 */
export interface ApiError {
  statusCode: number
  message: string
  errors?: Record<string, string[]> // Erreurs de validation par champ
}

/**
 * Options de pagination
 */
export interface PaginationOptions {
  page?: number
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * Métadonnées de pagination pour les réponses API
 */
export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Réponse API paginée avec métadonnées
 * @template T - Type des items dans la liste
 */
export interface PaginatedApiResponse<T> extends ApiResponse<{ data: T[]; meta: PaginationMeta }> {}
