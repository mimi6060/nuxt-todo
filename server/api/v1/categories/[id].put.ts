/**
 * PUT /api/v1/categories/:id
 * Updates an existing category
 *
 * @version v1
 */

import { CategoryResource } from '~/server/resources'

export default defineEventHandler((event) => CategoryResource.update(event))
