/**
 * DELETE /api/v1/todos/:id
 * Deletes a todo
 *
 * @version v1
 */

import { TodoResource } from '~/server/resources'

export default defineEventHandler((event) => TodoResource.delete(event))
