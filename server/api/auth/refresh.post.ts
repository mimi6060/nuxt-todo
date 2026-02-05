/**
 * POST /api/auth/refresh
 * Backward compatibility proxy - redirects to /api/v1/auth/refresh
 *
 * @deprecated Use /api/v1/auth/refresh instead
 * @see /api/v1/auth/refresh.post.ts
 */

export { default } from '~/server/api/v1/auth/refresh.post'
