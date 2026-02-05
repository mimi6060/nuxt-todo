/**
 * GET /api/categories/:id/delete-info
 * Backward compatibility proxy - redirects to /api/v1/categories/:id/delete-info
 *
 * @deprecated Use /api/v1/categories/:id/delete-info instead
 * @see /api/v1/categories/[id]/delete-info.get.ts
 */

export { default } from '~/server/api/v1/categories/[id]/delete-info.get'
