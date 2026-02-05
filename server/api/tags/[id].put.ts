/**
 * PUT /api/tags/:id
 * Backward compatibility proxy - redirects to /api/v1/tags/:id
 *
 * @deprecated Use /api/v1/tags/:id instead
 * @see /api/v1/tags/[id].put.ts
 */

export { default } from '~/server/api/v1/tags/[id].put'
