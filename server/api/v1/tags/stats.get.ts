/**
 * GET /api/v1/tags/stats
 * Retrieves tag usage statistics
 * Requires authentication
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.getStats(event))
