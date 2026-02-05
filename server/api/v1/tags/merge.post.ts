/**
 * POST /api/v1/tags/merge
 * Merges multiple tags into one
 * Body: { sourceTags: string[], targetTag: string }
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.merge(event))
