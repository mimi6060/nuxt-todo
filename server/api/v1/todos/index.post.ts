/**
 * POST /api/v1/todos
 * Creates a new todo
 *
 * @version v1
 */

import { TodoResource } from '~/server/resources'

export default defineEventHandler((event) => TodoResource.create(event))
