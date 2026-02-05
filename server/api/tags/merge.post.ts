/**
 * POST /api/tags/merge
 * Backward compatibility proxy - redirects to /api/v1/tags/merge
 *
 * @deprecated Use /api/v1/tags/merge instead
 * @see /api/v1/tags/merge.post.ts
 */

export { default } from '~/server/api/v1/tags/merge.post'
