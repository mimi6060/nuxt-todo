/**
 * Simple in-memory cache utility with TTL (Time-To-Live)
 *
 * Features:
 * - User-specific cache keys (include userId in the key)
 * - Configurable TTL per entry
 * - Automatic expiration cleanup
 * - Pattern-based invalidation (e.g., invalidate all keys starting with "tags:")
 *
 * Usage:
 * - cache.get<T>(key) - Get cached value
 * - cache.set(key, value, ttlMs) - Set value with TTL
 * - cache.invalidate(key) - Remove specific key
 * - cache.invalidatePattern(pattern) - Remove all keys matching pattern
 */

import { logger } from './logger'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()

  // Default TTL: 5 minutes
  private defaultTtl = 5 * 60 * 1000

  /**
   * Generate a user-specific cache key
   */
  key(prefix: string, userId: string, ...parts: string[]): string {
    const allParts = [prefix, userId, ...parts].filter(Boolean)
    return allParts.join(':')
  }

  /**
   * Get a cached value
   * Returns undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)

    if (!entry) {
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      logger.debug(`[Cache] Key expired: ${key}`)
      return undefined
    }

    logger.debug(`[Cache] Hit: ${key}`)
    return entry.value as T
  }

  /**
   * Set a cached value with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Time-to-live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs: number = this.defaultTtl): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs
    }

    this.store.set(key, entry)
    logger.debug(`[Cache] Set: ${key} (TTL: ${ttlMs}ms)`)
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): boolean {
    const deleted = this.store.delete(key)
    if (deleted) {
      logger.debug(`[Cache] Invalidated: ${key}`)
    }
    return deleted
  }

  /**
   * Invalidate all keys matching a pattern (prefix)
   * Example: invalidatePattern('categories:user123') removes all category cache for user123
   */
  invalidatePattern(pattern: string): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key)
        count++
      }
    }

    if (count > 0) {
      logger.debug(`[Cache] Invalidated ${count} keys matching: ${pattern}`)
    }

    return count
  }

  /**
   * Invalidate all cache entries for a specific user
   */
  invalidateUser(userId: string): number {
    let count = 0
    for (const key of this.store.keys()) {
      // Keys are formatted as "prefix:userId:..." so we check if userId is in the key
      if (key.includes(`:${userId}:`)) {
        this.store.delete(key)
        count++
      }
    }

    if (count > 0) {
      logger.debug(`[Cache] Invalidated ${count} keys for user: ${userId}`)
    }

    return count
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.store.size
    this.store.clear()
    logger.debug(`[Cache] Cleared all ${size} entries`)
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    }
  }

  /**
   * Cleanup expired entries (can be called periodically)
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`[Cache] Cleanup: removed ${cleaned} expired entries`)
    }

    return cleaned
  }
}

// Singleton instance
export const cache = new MemoryCache()

// Cache key prefixes for consistency
export const CacheKeys = {
  CATEGORIES: 'categories',
  TAGS: 'tags',
  TAG_SUGGESTIONS: 'tag-suggestions'
} as const

// Cache TTL values (in milliseconds)
export const CacheTTL = {
  // Categories rarely change - cache for 10 minutes
  CATEGORIES: 10 * 60 * 1000,
  // Tags change more often - cache for 5 minutes
  TAGS: 5 * 60 * 1000,
  // Tag suggestions depend on search query - cache for 2 minutes
  TAG_SUGGESTIONS: 2 * 60 * 1000
} as const

// Run cleanup every 5 minutes to remove expired entries
const CLEANUP_INTERVAL = 5 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Start periodic cache cleanup
 */
export function startCacheCleanup(): void {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      cache.cleanup()
    }, CLEANUP_INTERVAL)

    // Don't prevent process exit
    if (cleanupTimer.unref) {
      cleanupTimer.unref()
    }

    logger.info('[Cache] Started periodic cleanup')
  }
}

/**
 * Stop periodic cache cleanup
 */
export function stopCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
    logger.info('[Cache] Stopped periodic cleanup')
  }
}

// Auto-start cleanup in non-test environments
if (process.env.NODE_ENV !== 'test') {
  startCacheCleanup()
}
