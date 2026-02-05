/**
 * Type guards pour une meilleure sécurité de typage
 * Permet de remplacer les `any` par `unknown` avec des vérifications runtime
 */

/**
 * Structure d'une erreur API typique
 */
export interface ApiErrorResponse {
  message: string
  statusCode?: number
  data?: {
    code: string
    retryAfter?: number
    [key: string]: unknown
  }
}

/**
 * Type guard pour vérifier si une erreur est une ApiErrorResponse
 * @param err - L'erreur à vérifier (de type unknown)
 * @returns true si l'erreur correspond à la structure ApiErrorResponse
 */
export function isApiError(err: unknown): err is ApiErrorResponse {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as ApiErrorResponse).message === 'string'
  )
}
