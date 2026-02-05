/**
 * POST /api/v1/tags
 * Creates a new tag
 *
 * @version v1
 */

import { TagResource } from '~/server/resources/TagResource'

export default defineEventHandler((event) => TagResource.create(event))
