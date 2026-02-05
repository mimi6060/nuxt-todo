/**
 * POST /api/todos
 * Backward compatibility proxy - redirects to /api/v1/todos
 *
 * @deprecated Use /api/v1/todos instead
 * @see /api/v1/todos/index.post.ts
 */

export { default } from '~/server/api/v1/todos/index.post'
