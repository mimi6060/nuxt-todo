/**
 * GET /api/v1/categories
 * Retrieves all categories with associated todo count
 *
 * @version v1
 */

import { CategoryResource } from '~/server/resources'

export default defineEventHandler((event) => CategoryResource.getAllWithCount(event))
