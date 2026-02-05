/**
 * GET /api/v1/categories/:id/delete-info
 * Returns information before deletion (number of associated todos)
 *
 * @version v1
 */

import { CategoryResource } from '~/server/resources'

export default defineEventHandler((event) => CategoryResource.getDeleteInfo(event))
