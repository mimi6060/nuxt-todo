/**
 * DELETE /api/v1/tags/:id
 * Deletes a tag
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.remove(event))
