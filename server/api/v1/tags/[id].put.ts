/**
 * PUT /api/v1/tags/:id
 * Updates a tag (name, color)
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.update(event))
