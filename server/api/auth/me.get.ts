/**
 * GET /api/auth/me
 * Backward compatibility proxy - redirects to /api/v1/auth/me
 *
 * @deprecated Use /api/v1/auth/me instead
 * @see /api/v1/auth/me.get.ts
 */

export { default } from '~/server/api/v1/auth/me.get'
