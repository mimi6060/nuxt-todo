/**
 * Types pour l'application Todo
 * Ces types sont synchronisés avec le schéma Prisma
 */

// Priority est défini dans constants/priorities.ts (source unique)
export type { Priority } from '~/constants/priorities'

// Types de filtres définis dans constants/filters.ts (source unique)
export type { StatusFilter, SortBy, SortOrder } from '~/constants/filters'

// Alias pour compatibilité
export type TodoPriority = import('~/constants/priorities').Priority

// Statut du todo (sans 'all')
export type TodoStatus = 'active' | 'completed'

/**
 * Type Tag
 * Correspond au modèle Prisma Tag
 */
export interface Tag {
  id: string
  name: string
  color: string | null
  createdAt: string
}

/**
 * Type Todo principal
 * Correspond au modèle Prisma Todo
 */
export interface Todo {
  id: string
  title: string
  description: string | null
  completed: boolean
  priority: TodoPriority
  categories: Category[]  // Relation many-to-many avec Category
  tags: Tag[]             // Relation many-to-many avec Tag
  deadline: string | null // ISO date string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  completedAt: string | null // ISO date string
}

/**
 * Type Category
 * Correspond au modèle Prisma Category
 */
export interface Category {
  id: string
  name: string
  color: string
  icon: string | null
  todos?: Todo[] // Relation optionnelle
}

/**
 * Category avec le compteur de todos
 * Utilisé par GET /api/categories
 */
export interface CategoryWithCount extends Category {
  todosCount: number
}

/**
 * Options de filtrage des todos
 */
export interface TodoFilters {
  status?: 'all' | TodoStatus
  priority?: TodoPriority
  categoryId?: string
  tag?: string
  search?: string
  hasDeadline?: boolean
  overdue?: boolean
}

/**
 * Options de tri des todos
 */
export interface TodoSortOptions {
  field: import('~/constants/filters').SortBy | 'updatedAt'
  order: import('~/constants/filters').SortOrder
}

// ============================================
// DTOs
// ============================================

/**
 * DTO pour créer une catégorie
 */
export interface CreateCategoryDTO {
  name: string
  color: string
  icon?: string
}

/**
 * DTO pour mettre à jour une catégorie
 */
export interface UpdateCategoryDTO {
  name?: string
  color?: string
  icon?: string
}

/**
 * DTO pour créer un todo
 */
export interface CreateTodoDTO {
  title: string
  description?: string
  priority?: TodoPriority
  categoryIds: string[]  // Many-to-many: au moins une catégorie requise
  tags?: string[]
  deadline?: string // ISO date string
}

/**
 * DTO pour mettre à jour un todo
 */
export interface UpdateTodoDTO {
  title?: string
  description?: string
  completed?: boolean
  priority?: TodoPriority
  categoryIds?: string[]  // Many-to-many: liste des catégories
  tags?: string[]
  deadline?: string | null
}

/**
 * Statistiques des todos
 */
export interface TodoStats {
  total: number
  active: number
  completed: number
  overdue: number
  byPriority: Record<TodoPriority, number>
  byCategory: Record<string, number>
}
