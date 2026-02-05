/**
 * Constantes pour l'API
 * Centralise les configurations des requêtes HTTP
 */

// ============================================
// TIMEOUTS
// ============================================

/** Timeout par défaut pour les requêtes (ms) */
export const REQUEST_TIMEOUT = 10000

/** Timeout pour les requêtes longues (uploads, exports) */
export const LONG_REQUEST_TIMEOUT = 30000

/** Timeout pour les requêtes courtes (santé, ping) */
export const SHORT_REQUEST_TIMEOUT = 5000

// ============================================
// RETRY
// ============================================

/** Nombre de tentatives par défaut */
export const DEFAULT_RETRY_COUNT = 3

/** Délai entre les tentatives (ms) */
export const RETRY_DELAY = 1000

/** Délai max entre les tentatives avec backoff exponentiel (ms) */
export const MAX_RETRY_DELAY = 10000

// ============================================
// PAGINATION
// ============================================

/** Nombre d'éléments par page par défaut */
export const DEFAULT_PAGE_SIZE = 20

/** Nombre maximum d'éléments par page */
export const MAX_PAGE_SIZE = 100

/** Nombre minimum d'éléments par page */
export const MIN_PAGE_SIZE = 1

// ============================================
// DEBOUNCE
// ============================================

/** Délai de debounce pour la recherche (ms) */
export const SEARCH_DEBOUNCE_DELAY = 300

/** Délai de debounce pour les sauvegardes automatiques (ms) */
export const AUTOSAVE_DEBOUNCE_DELAY = 1000

// ============================================
// CACHE
// ============================================

/** Durée de cache par défaut (ms) */
export const DEFAULT_CACHE_DURATION = 60000 // 1 minute

/** Durée de cache pour les données statiques (ms) */
export const STATIC_CACHE_DURATION = 300000 // 5 minutes
