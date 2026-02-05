/**
 * GET /api/v1/todos
 * Retrieves all todos with optional filtering
 *
 * @version v1
 */

import { TodoResource } from '~/server/resources'

export default defineEventHandler((event) => TodoResource.getAllWithFilters(event))
