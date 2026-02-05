/**
 * POST /api/v1/categories
 * Creates a new category
 *
 * @version v1
 */

import { CategoryResource } from '~/server/resources'

export default defineEventHandler((event) => CategoryResource.create(event))
