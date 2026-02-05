/**
 * Utilitaires de sérialisation pour convertir les types Prisma en types API
 *
 * Prisma retourne des objets Date, mais pour la sérialisation JSON,
 * on doit les convertir en strings ISO 8601
 */

import type { Todo as PrismaTodo, Category as PrismaCategory, Tag as PrismaTag } from '~/generated/prisma/index.js'
import type { Todo, Category, Tag } from '~/types/todo'

/**
 * Convertit un Tag Prisma en Tag API
 */
export function serializeTag(prismaTag: PrismaTag): Tag {
  return {
    id: prismaTag.id,
    name: prismaTag.name,
    color: prismaTag.color,
    createdAt: prismaTag.createdAt.toISOString(),
  }
}

/**
 * Convertit un Todo Prisma (avec Date et relations) en Todo API (avec string)
 */
export function serializeTodo(
  prismaTodo: PrismaTodo & { categories?: PrismaCategory[]; tags?: PrismaTag[] }
): Todo {
  return {
    id: prismaTodo.id,
    title: prismaTodo.title,
    description: prismaTodo.description,
    completed: prismaTodo.completed,
    priority: prismaTodo.priority,
    categories: (prismaTodo.categories || []).map(serializeCategory),
    tags: (prismaTodo.tags || []).map(serializeTag),
    deadline: prismaTodo.deadline?.toISOString() || null,
    createdAt: prismaTodo.createdAt.toISOString(),
    updatedAt: prismaTodo.updatedAt.toISOString(),
    completedAt: prismaTodo.completedAt?.toISOString() || null,
  }
}

/**
 * Convertit une Category Prisma en Category API
 */
export function serializeCategory(prismaCategory: PrismaCategory): Category {
  return {
    id: prismaCategory.id,
    name: prismaCategory.name,
    color: prismaCategory.color,
    icon: prismaCategory.icon,
  }
}

/**
 * Convertit un tableau de todos Prisma en todos API
 */
export function serializeTodos(
  prismaTodos: (PrismaTodo & { categories?: PrismaCategory[]; tags?: PrismaTag[] })[]
): Todo[] {
  return prismaTodos.map(serializeTodo)
}
