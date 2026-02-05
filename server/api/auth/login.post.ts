/**
 * POST /api/auth/login
 * Backward compatibility proxy - redirects to /api/v1/auth/login
 *
 * @deprecated Use /api/v1/auth/login instead
 * @see /api/v1/auth/login.post.ts
 */

export { default } from '~/server/api/v1/auth/login.post'
