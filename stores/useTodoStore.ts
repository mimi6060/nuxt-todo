/**
 * Pinia Store pour la gestion des Todos
 *
 * 📚 Concepts Pinia:
 * - State: données réactives (comme data() dans Vue)
 * - Getters: computed properties dérivés du state
 * - Actions: méthodes pour modifier le state (peuvent être async)
 *
 * Dans Nuxt, les stores sont auto-importés!
 * Usage: const todoStore = useTodoStore()
 */

import { defineStore } from 'pinia'
import type { Todo, CreateTodoDTO, UpdateTodoDTO, TodoStats, Priority } from '~/types/todo'
import type { ApiResponse, PaginationMeta } from '~/types/api'
import { PRIORITY_KEYS } from '~/constants/priorities'

// Type pour les erreurs de fetch
interface FetchError {
  data?: { data?: { code?: string } }
  message?: string
}

export const useTodoStore = defineStore('todos', {
  /**
   * STATE : Données réactives du store
   */
  state: () => ({
    todos: [] as Todo[],
    loading: false,
    error: null as string | null,
    // Pagination metadata
    pagination: null as PaginationMeta | null,
    // Derniers filtres utilisés (pour rafraîchir après CRUD)
    lastFilters: null as Record<string, string> | null,
    // Race condition protection
    _currentFetchRequestId: 0,
    _pendingOperations: new Map<string, Promise<unknown>>(),
  }),

  /**
   * GETTERS : Computed properties dérivés du state
   * Sont automatiquement mis en cache et recalculés si leurs dépendances changent
   */
  getters: {
    /**
     * Todos non complétés
     */
    activeTodos: (state): Todo[] => {
      return state.todos.filter(t => !t.completed)
    },

    /**
     * Todos complétés
     */
    completedTodos: (state): Todo[] => {
      return state.todos.filter(t => t.completed)
    },

    /**
     * Todos par catégorie (getter paramétré)
     * Usage: todoStore.todosByCategory('work')
     */
    todosByCategory: (state) => {
      return (categoryId: string): Todo[] => {
        return state.todos.filter(t =>
          t.categories?.some(c => c.id === categoryId)
        )
      }
    },

    /**
     * Todos par priorité
     */
    todosByPriority: (state) => {
      return (priority: string): Todo[] => {
        return state.todos.filter(t => t.priority === priority)
      }
    },

    /**
     * Todos en retard (deadline passée et pas complété)
     */
    overdueTodos: (state): Todo[] => {
      const now = new Date()
      return state.todos.filter(t =>
        !t.completed &&
        t.deadline &&
        new Date(t.deadline) < now
      )
    },

    /**
     * Statistiques globales
     */
    stats: (state): TodoStats => {
      const now = new Date()
      const todos = state.todos

      // Compter par priorité (dérivé de PRIORITY_KEYS)
      const byPriority = Object.fromEntries(
        PRIORITY_KEYS.map((priority) => [
          priority,
          todos.filter((t) => t.priority === priority).length,
        ])
      ) as Record<Priority, number>

      // Compter par catégorie (many-to-many)
      const byCategory: Record<string, number> = {}
      todos.forEach(todo => {
        if (todo.categories && todo.categories.length > 0) {
          todo.categories.forEach(cat => {
            byCategory[cat.name] = (byCategory[cat.name] || 0) + 1
          })
        } else {
          byCategory['Sans catégorie'] = (byCategory['Sans catégorie'] || 0) + 1
        }
      })

      return {
        total: todos.length,
        active: todos.filter(t => !t.completed).length,
        completed: todos.filter(t => t.completed).length,
        overdue: todos.filter(t =>
          !t.completed && t.deadline && new Date(t.deadline) < now
        ).length,
        byPriority,
        byCategory,
      }
    },

    /**
     * Vérifie s'il y a une page suivante
     */
    hasNextPage: (state): boolean => {
      if (!state.pagination) return false
      return state.pagination.page < state.pagination.totalPages
    },

    /**
     * Vérifie s'il y a une page précédente
     */
    hasPreviousPage: (state): boolean => {
      if (!state.pagination) return false
      return state.pagination.page > 1
    },

    /**
     * Nombre total de todos (depuis les métadonnées de pagination)
     */
    totalTodos: (state): number => {
      return state.pagination?.total ?? state.todos.length
    },

    /**
     * Page courante
     */
    currentPage: (state): number => {
      return state.pagination?.page ?? 1
    },

    /**
     * Nombre total de pages
     */
    totalPages: (state): number => {
      return state.pagination?.totalPages ?? 1
    },
  },

  /**
   * ACTIONS : Méthodes pour modifier le state
   * Peuvent être async et appeler des APIs
   */
  actions: {
    /**
     * Récupérer tous les todos depuis l'API avec pagination
     * Protégé contre les race conditions: seule la dernière requête met à jour l'état
     *
     * @param filters - Filtres optionnels (status, category, page, limit, etc.)
     * @returns Les métadonnées de pagination ou null en cas d'erreur
     */
    async fetchTodos(filters?: Record<string, string>): Promise<PaginationMeta | null> {
      // Generate unique request ID for race condition protection
      const requestId = ++this._currentFetchRequestId

      this.loading = true
      this.error = null
      // Stocker les filtres pour pouvoir rafraîchir après les opérations CRUD
      if (filters) {
        this.lastFilters = { ...filters }
      }

      try {
        const { getAuthHeaders } = useAuth()

        // Construire les query params
        const queryParams = new URLSearchParams(filters || {})
        const url = `/api/todos${queryParams.toString() ? '?' + queryParams.toString() : ''}`

        // $fetch avec headers d'authentification
        const response = await $fetch<ApiResponse<{ data: Todo[]; meta: PaginationMeta }>>(url, {
          headers: getAuthHeaders()
        })

        // Race condition guard: only update state if this is still the latest request
        if (requestId !== this._currentFetchRequestId) {
          return null
        }

        if (response.success && response.data) {
          this.todos = response.data.data
          this.pagination = response.data.meta
          return response.data.meta
        } else {
          this.error = response.error || 'Failed to fetch todos'
          return null
        }
      } catch (err: unknown) {
        // Only set error if this is still the latest request
        if (requestId === this._currentFetchRequestId) {
          const { isAuthError, handleAuthError } = useAuth()
          // Check if it's an auth error and redirect to login
          if (isAuthError(err)) {
            handleAuthError()
            return null
          }
          const fetchErr = err as FetchError
          this.error = fetchErr.data?.data?.code || fetchErr.message || 'Failed to fetch todos'
          console.error('Error fetching todos:', err)
        }
        return null
      } finally {
        // Only clear loading if this is still the latest request
        if (requestId === this._currentFetchRequestId) {
          this.loading = false
        }
      }
    },

    /**
     * Créer un nouveau todo
     * Note: avec filtrage serveur, on ajoute localement pour feedback immédiat
     * mais les stats peuvent être légèrement décalées jusqu'au prochain fetch
     *
     * @param todoData - Données du todo à créer
     * @returns Le todo créé ou null en cas d'erreur
     */
    async createTodo(todoData: CreateTodoDTO): Promise<Todo | null> {
      this.loading = true
      this.error = null

      try {
        const { getAuthHeaders } = useAuth()

        const response = await $fetch<ApiResponse<Todo>>('/api/todos', {
          method: 'POST',
          body: todoData,
          headers: getAuthHeaders()
        })

        if (response.success && response.data) {
          // Ajouter le nouveau todo au début pour feedback immédiat
          this.todos.unshift(response.data)
          // Mettre à jour le total si disponible
          if (this.pagination) {
            this.pagination.total += 1
          }
          return response.data
        } else {
          this.error = response.error || 'Failed to create todo'
          return null
        }
      } catch (err: unknown) {
        const { isAuthError, handleAuthError } = useAuth()
        if (isAuthError(err)) {
          handleAuthError()
          return null
        }
        const fetchErr = err as FetchError
        this.error = fetchErr.data?.data?.code || fetchErr.message || 'Failed to create todo'
        console.error('Error creating todo:', err)
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Mettre à jour un todo existant
     * Protégé contre les opérations concurrentes sur le même todo
     *
     * @param id - ID du todo
     * @param updates - Données à mettre à jour
     * @returns Le todo mis à jour ou null
     */
    async updateTodo(id: string, updates: UpdateTodoDTO): Promise<Todo | null> {
      // Wait for any pending operation on this item
      const existingOperation = this._pendingOperations.get(id)
      if (existingOperation) {
        await existingOperation.catch(() => {})
      }

      this.loading = true
      this.error = null

      const operationPromise = (async () => {
        try {
          const { getAuthHeaders } = useAuth()

          const response = await $fetch<ApiResponse<Todo>>(`/api/todos/${id}`, {
            method: 'PUT',
            body: updates,
            headers: getAuthHeaders()
          })

          if (response.success && response.data) {
            const index = this.todos.findIndex(t => t.id === id)
            if (index !== -1) {
              this.todos[index] = response.data
            }
            return response.data
          } else {
            this.error = response.error || 'Failed to update todo'
            return null
          }
        } catch (err: unknown) {
          const { isAuthError, handleAuthError } = useAuth()
          if (isAuthError(err)) {
            handleAuthError()
            return null
          }
          const fetchErr = err as FetchError
          this.error = fetchErr.data?.data?.code || fetchErr.message || 'Failed to update todo'
          console.error('Error updating todo:', err)
          return null
        } finally {
          this.loading = false
          this._pendingOperations.delete(id)
        }
      })()

      this._pendingOperations.set(id, operationPromise)
      return operationPromise
    },

    /**
     * Supprimer un todo
     * Protégé contre les opérations concurrentes sur le même todo
     *
     * @param id - ID du todo à supprimer
     * @returns true si supprimé, false sinon
     */
    async deleteTodo(id: string): Promise<boolean> {
      // Wait for any pending operation on this item
      const existingOperation = this._pendingOperations.get(id)
      if (existingOperation) {
        await existingOperation.catch(() => {})
      }

      this.loading = true
      this.error = null

      const operationPromise = (async () => {
        try {
          const { getAuthHeaders } = useAuth()

          await $fetch(`/api/todos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          })

          this.todos = this.todos.filter(t => t.id !== id)
          return true
        } catch (err: unknown) {
          const { isAuthError, handleAuthError } = useAuth()
          if (isAuthError(err)) {
            handleAuthError()
            return false
          }
          const fetchErr = err as FetchError
          this.error = fetchErr.data?.data?.code || fetchErr.message || 'Failed to delete todo'
          console.error('Error deleting todo:', err)
          return false
        } finally {
          this.loading = false
          this._pendingOperations.delete(id)
        }
      })()

      this._pendingOperations.set(id, operationPromise)
      return operationPromise
    },

    /**
     * Toggle le statut completed d'un todo
     * Raccourci pour updateTodo avec juste le champ completed
     * Note: updateTodo already handles race conditions, so rapid toggles are safe
     *
     * @param id - ID du todo
     */
    async toggleTodo(id: string): Promise<void> {
      const todo = this.todos.find(t => t.id === id)
      if (!todo) return

      // Check if there's already a pending operation - if so, skip this toggle
      // This prevents UI flickering from rapid clicks
      if (this._pendingOperations.has(id)) {
        return
      }

      await this.updateTodo(id, {
        completed: !todo.completed
      })
    },

    /**
     * Initialiser les todos avec des données (utile pour l'hydratation SSR)
     *
     * @param todos - Tableau de todos à initialiser
     */
    setTodos(todos: Todo[]) {
      this.todos = todos
    },

    /**
     * Réinitialiser l'état du store
     * Utile pour le logout ou le reset
     */
    $reset() {
      this.todos = []
      this.loading = false
      this.error = null
      this.pagination = null
      this.lastFilters = null
      this._currentFetchRequestId = 0
      this._pendingOperations.clear()
    },
  },
})
