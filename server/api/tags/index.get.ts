/**
 * GET /api/tags
 * Backward compatibility proxy - redirects to /api/v1/tags
 *
 * @deprecated Use /api/v1/tags instead
 * @see /api/v1/tags/index.get.ts
 */

export { default } from '~/server/api/v1/tags/index.get'
