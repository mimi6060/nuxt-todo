/**
 * GET /api/tags/suggestions
 * Backward compatibility proxy - redirects to /api/v1/tags/suggestions
 *
 * @deprecated Use /api/v1/tags/suggestions instead
 * @see /api/v1/tags/suggestions.get.ts
 */

export { default } from '~/server/api/v1/tags/suggestions.get'
