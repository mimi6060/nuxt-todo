/**
 * POST /api/auth/logout
 * Backward compatibility proxy - redirects to /api/v1/auth/logout
 *
 * @deprecated Use /api/v1/auth/logout instead
 * @see /api/v1/auth/logout.post.ts
 */

export { default } from '~/server/api/v1/auth/logout.post'
