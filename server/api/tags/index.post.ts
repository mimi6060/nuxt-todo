/**
 * POST /api/tags
 * Backward compatibility proxy - redirects to /api/v1/tags
 *
 * @deprecated Use /api/v1/tags instead
 * @see /api/v1/tags/index.post.ts
 */

export { default } from '~/server/api/v1/tags/index.post'
