/**
 * PUT /api/v1/todos/:id
 * Updates an existing todo
 *
 * @version v1
 */

import { TodoResource } from '~/server/resources'

export default defineEventHandler((event) => TodoResource.update(event))
