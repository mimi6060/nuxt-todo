/**
 * Composable pour la gestion centralisée des erreurs API
 *
 * Fournit des helpers pour:
 * - Détecter les types d'erreurs (timeout, réseau, API)
 * - Obtenir des messages d'erreur traduits
 * - Gérer les erreurs de rate limiting
 */

import { isApiError } from '~/types/guards'

// ============================================
// TYPES
// ============================================

export interface ApiErrorInfo {
  message: string
  code?: string
  isTimeout: boolean
  isNetwork: boolean
  isRateLimited: boolean
  retryAfter?: number
}

// ============================================
// COMPOSABLE
// ============================================

export function useApiError() {
  const { t } = useI18n()

  /**
   * Vérifie si l'erreur est une erreur de timeout
   */
  function isTimeoutError(err: unknown): boolean {
    if (err instanceof Error) {
      return (
        err.name === 'TimeoutError' ||
        err.name === 'AbortError' ||
        err.message?.toLowerCase().includes('timeout') ||
        err.message?.toLowerCase().includes('aborted')
      )
    }
    return false
  }

  /**
   * Vérifie si l'erreur est une erreur réseau
   */
  function isNetworkError(err: unknown): boolean {
    if (err instanceof Error) {
      return (
        err.name === 'NetworkError' ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('fetch failed') ||
        err.message?.toLowerCase().includes('failed to fetch')
      )
    }
    return false
  }

  /**
   * Vérifie si l'erreur est un rate limit (429)
   */
  function isRateLimitError(err: unknown): boolean {
    if (isApiError(err)) {
      return err.statusCode === 429 || err.data?.code === 'RATE_LIMITED'
    }
    return false
  }

  /**
   * Extrait le délai retry-after d'une erreur de rate limit
   */
  function getRetryAfter(err: unknown): number | undefined {
    if (isApiError(err) && err.data?.retryAfter) {
      return Number(err.data.retryAfter)
    }
    return undefined
  }

  /**
   * Obtient le code d'erreur API
   */
  function getErrorCode(err: unknown): string | undefined {
    if (isApiError(err) && err.data?.code) {
      return err.data.code as string
    }
    return undefined
  }

  /**
   * Obtient le message d'erreur traduit
   */
  function getErrorMessage(err: unknown, defaultKey: string = 'errors.generic'): string {
    // Timeout
    if (isTimeoutError(err)) {
      return t('errors.timeoutError')
    }

    // Erreur réseau
    if (isNetworkError(err)) {
      return t('errors.networkError')
    }

    // Rate limit
    if (isRateLimitError(err)) {
      const retryAfter = getRetryAfter(err)
      if (retryAfter) {
        return t('errors.rateLimited', { seconds: retryAfter })
      }
      return t('errors.rateLimited', { seconds: 60 })
    }

    // Erreur API avec code
    const code = getErrorCode(err)
    if (code) {
      const translationKey = `apiErrors.${code}`
      const translated = t(translationKey)
      // Si la traduction existe (différente de la clé), l'utiliser
      if (translated !== translationKey) {
        return translated
      }
    }

    // Message par défaut
    return t(defaultKey)
  }

  /**
   * Analyse complète d'une erreur
   */
  function analyzeError(err: unknown, defaultKey: string = 'errors.generic'): ApiErrorInfo {
    return {
      message: getErrorMessage(err, defaultKey),
      code: getErrorCode(err),
      isTimeout: isTimeoutError(err),
      isNetwork: isNetworkError(err),
      isRateLimited: isRateLimitError(err),
      retryAfter: getRetryAfter(err)
    }
  }

  /**
   * Log une erreur avec contexte
   */
  function logError(err: unknown, context: string): void {
    const info = analyzeError(err)
    console.error(`[${context}]`, {
      message: info.message,
      code: info.code,
      isTimeout: info.isTimeout,
      isNetwork: info.isNetwork,
      isRateLimited: info.isRateLimited,
      originalError: err
    })
  }

  return {
    // Détecteurs
    isTimeoutError,
    isNetworkError,
    isRateLimitError,

    // Extracteurs
    getRetryAfter,
    getErrorCode,
    getErrorMessage,

    // Utilitaires
    analyzeError,
    logError
  }
}
