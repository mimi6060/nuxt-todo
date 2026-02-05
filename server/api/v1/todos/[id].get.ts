/**
 * GET /api/v1/todos/:id
 * Retrieves a specific todo by ID
 *
 * @version v1
 */

import { TodoResource } from '~/server/resources'

export default defineEventHandler((event) => TodoResource.getById(event))
