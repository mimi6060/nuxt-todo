/**
 * Middleware de Rate Limiting avancé
 *
 * Protège l'API contre les abus avec:
 * - Sliding window algorithm
 * - Limites différenciées par type d'opération
 * - Limites par endpoint sensible
 * - Délai progressif avant blocage
 * - Blacklist temporaire des IPs abusives
 * - Headers de sécurité
 * - Nettoyage automatique de la mémoire
 */

import type { H3Event } from 'h3'

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Limites par défaut (requests par fenêtre)
  limits: {
    read: 100,      // GET requests
    write: 30,      // POST/PUT/PATCH
    delete: 10,     // DELETE (plus restrictif)
  },

  // Limites par endpoint sensible (supports both versioned and non-versioned paths)
  endpointLimits: {
    // Non-versioned paths (backward compatibility)
    '/api/tags/merge': { limit: 5, window: 60000 },
    '/api/categories': { limit: 20, window: 60000 },
    // Versioned paths (v1)
    '/api/v1/tags/merge': { limit: 5, window: 60000 },
    '/api/v1/categories': { limit: 20, window: 60000 },
  } as Record<string, { limit: number; window: number }>,

  // Fenêtre temporelle par défaut (ms)
  windowMs: 60000, // 1 minute

  // Seuil pour blacklist temporaire (violations consécutives)
  blacklistThreshold: 5,

  // Durée du blacklist (ms)
  blacklistDuration: 300000, // 5 minutes

  // Intervalle de nettoyage mémoire (ms)
  cleanupInterval: 60000, // 1 minute

  // Nombre max d'entrées avant nettoyage forcé
  maxEntries: 10000,

  // Délai progressif (ms) ajouté par violation
  progressiveDelayMs: 100,

  // Délai max (ms)
  maxDelayMs: 2000,
} as const

// ============================================
// TYPES
// ============================================

interface RateLimitEntry {
  count: number
  windowStart: number
  violations: number
  lastViolation: number
}

interface BlacklistEntry {
  blockedUntil: number
  reason: string
}

// ============================================
// STORES
// ============================================

const rateLimitStore = new Map<string, RateLimitEntry>()
const blacklistStore = new Map<string, BlacklistEntry>()

let lastCleanup = Date.now()

// ============================================
// HELPERS
// ============================================

/**
 * Extrait l'IP réelle du client (supporte proxies)
 */
function getClientIP(event: H3Event): string {
  // Headers courants pour les proxies
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  if (forwardedFor) {
    // Prendre la première IP (client original)
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = getHeader(event, 'x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  return getRequestIP(event) || 'unknown'
}

/**
 * Détermine le type d'opération
 */
function getOperationType(method: string): 'read' | 'write' | 'delete' {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return 'read'
  }
  if (method === 'DELETE') {
    return 'delete'
  }
  return 'write'
}

/**
 * Obtient la limite pour une requête
 */
function getLimit(event: H3Event): { limit: number; window: number } {
  const path = event.path

  // Vérifier les limites par endpoint
  for (const [endpoint, config] of Object.entries(CONFIG.endpointLimits)) {
    if (path.startsWith(endpoint)) {
      return config
    }
  }

  // Limite par défaut selon le type d'opération
  const opType = getOperationType(event.method)
  return {
    limit: CONFIG.limits[opType],
    window: CONFIG.windowMs
  }
}

/**
 * Nettoie les entrées expirées
 */
function cleanup(): void {
  const now = Date.now()

  // Nettoyer le rate limit store
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > CONFIG.windowMs * 2) {
      rateLimitStore.delete(key)
    }
  }

  // Nettoyer le blacklist store
  for (const [key, entry] of blacklistStore.entries()) {
    if (now > entry.blockedUntil) {
      blacklistStore.delete(key)
    }
  }

  lastCleanup = now
}

/**
 * Vérifie si un nettoyage est nécessaire
 */
function shouldCleanup(): boolean {
  const now = Date.now()
  return (
    now - lastCleanup > CONFIG.cleanupInterval ||
    rateLimitStore.size > CONFIG.maxEntries
  )
}

/**
 * Ajoute les headers de rate limit à la réponse
 */
function setRateLimitHeaders(
  event: H3Event,
  limit: number,
  remaining: number,
  resetAt: number
): void {
  setHeader(event, 'X-RateLimit-Limit', limit.toString())
  setHeader(event, 'X-RateLimit-Remaining', Math.max(0, remaining).toString())
  setHeader(event, 'X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString())
}

/**
 * Ajoute les headers de sécurité
 */
function setSecurityHeaders(event: H3Event): void {
  // Empêcher le sniffing de content-type
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  // Protection XSS
  setHeader(event, 'X-XSS-Protection', '1; mode=block')

  // Empêcher le framing (clickjacking)
  setHeader(event, 'X-Frame-Options', 'DENY')

  // Politique de referrer
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
}

// ============================================
// MIDDLEWARE
// ============================================

export default defineEventHandler(async (event) => {
  // Ne s'applique qu'aux routes API
  if (!event.path.startsWith('/api/')) return

  // Ajouter les headers de sécurité
  setSecurityHeaders(event)

  const ip = getClientIP(event)
  const now = Date.now()

  // Nettoyage périodique
  if (shouldCleanup()) {
    cleanup()
  }

  // Vérifier le blacklist
  const blacklistEntry = blacklistStore.get(ip)
  if (blacklistEntry && now < blacklistEntry.blockedUntil) {
    const retryAfter = Math.ceil((blacklistEntry.blockedUntil - now) / 1000)

    setHeader(event, 'Retry-After', retryAfter)
    setHeader(event, 'X-RateLimit-Remaining', '0')

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'RATE_LIMITED',
      data: {
        code: 'RATE_LIMITED',
        reason: blacklistEntry.reason,
        retryAfter
      }
    })
  }

  // Obtenir la configuration de limite
  const { limit, window } = getLimit(event)
  const opType = getOperationType(event.method)
  const key = `${ip}:${opType}`

  // Obtenir ou créer l'entrée
  let entry = rateLimitStore.get(key)

  // Réinitialiser si la fenêtre est expirée
  if (!entry || now - entry.windowStart > window) {
    entry = {
      count: 0,
      windowStart: now,
      violations: entry?.violations || 0,
      lastViolation: entry?.lastViolation || 0
    }
  }

  // Réduire les violations si pas de violation récente (grâce)
  if (entry.violations > 0 && now - entry.lastViolation > CONFIG.windowMs * 2) {
    entry.violations = Math.max(0, entry.violations - 1)
  }

  // Incrémenter le compteur
  entry.count++
  rateLimitStore.set(key, entry)

  // Calculer le temps restant dans la fenêtre
  const resetAt = entry.windowStart + window
  const remaining = limit - entry.count

  // Ajouter les headers de rate limit
  setRateLimitHeaders(event, limit, remaining, resetAt)

  // Vérifier si la limite est dépassée
  if (entry.count > limit) {
    entry.violations++
    entry.lastViolation = now
    rateLimitStore.set(key, entry)

    // Ajouter au blacklist si trop de violations
    if (entry.violations >= CONFIG.blacklistThreshold) {
      blacklistStore.set(ip, {
        blockedUntil: now + CONFIG.blacklistDuration,
        reason: `Exceeded rate limit ${entry.violations} times`
      })
    }

    const retryAfter = Math.ceil((resetAt - now) / 1000)
    setHeader(event, 'Retry-After', retryAfter)

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'RATE_LIMITED',
      data: {
        code: 'RATE_LIMITED',
        retryAfter,
        violations: entry.violations
      }
    })
  }

  // Délai progressif si proche de la limite (avertissement)
  if (entry.count > limit * 0.8 && entry.violations > 0) {
    const delay = Math.min(
      entry.violations * CONFIG.progressiveDelayMs,
      CONFIG.maxDelayMs
    )
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
})

// ============================================
// EXPORTS POUR TESTS
// ============================================

export const _testing = {
  rateLimitStore,
  blacklistStore,
  cleanup,
  getClientIP,
  getLimit,
  CONFIG
}
