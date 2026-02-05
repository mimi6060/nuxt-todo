/**
 * DELETE /api/todos/:id
 * Backward compatibility proxy - redirects to /api/v1/todos/:id
 *
 * @deprecated Use /api/v1/todos/:id instead
 * @see /api/v1/todos/[id].delete.ts
 */

export { default } from '~/server/api/v1/todos/[id].delete'
