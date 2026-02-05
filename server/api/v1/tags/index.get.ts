/**
 * GET /api/v1/tags
 * Retrieves all unique tags with their usage count
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.getAll(event))
