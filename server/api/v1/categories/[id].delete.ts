/**
 * DELETE /api/v1/categories/:id
 * Deletes a category (and all associated todos via cascade)
 *
 * @version v1
 */

import { CategoryResource } from '~/server/resources'

export default defineEventHandler((event) => CategoryResource.delete(event))
