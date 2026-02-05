/**
 * DELETE /api/categories/:id
 * Backward compatibility proxy - redirects to /api/v1/categories/:id
 *
 * @deprecated Use /api/v1/categories/:id instead
 * @see /api/v1/categories/[id].delete.ts
 */

export { default } from '~/server/api/v1/categories/[id].delete'
