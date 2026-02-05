/**
 * GET /api/v1/tags/suggestions
 * Retrieves tag suggestions for autocomplete
 * Query params: search (optional)
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.getSuggestions(event))
