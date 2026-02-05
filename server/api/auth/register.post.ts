/**
 * POST /api/auth/register
 * Backward compatibility proxy - redirects to /api/v1/auth/register
 *
 * @deprecated Use /api/v1/auth/register instead
 * @see /api/v1/auth/register.post.ts
 */

export { default } from '~/server/api/v1/auth/register.post'
