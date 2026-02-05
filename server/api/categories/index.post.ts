/**
 * POST /api/categories
 * Backward compatibility proxy - redirects to /api/v1/categories
 *
 * @deprecated Use /api/v1/categories instead
 * @see /api/v1/categories/index.post.ts
 */

export { default } from '~/server/api/v1/categories/index.post'
