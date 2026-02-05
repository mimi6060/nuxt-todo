/**
 * GET /api/tags/stats
 * Backward compatibility proxy - redirects to /api/v1/tags/stats
 *
 * @deprecated Use /api/v1/tags/stats instead
 * @see /api/v1/tags/stats.get.ts
 */

export { default } from '~/server/api/v1/tags/stats.get'
