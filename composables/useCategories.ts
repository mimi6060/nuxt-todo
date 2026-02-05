/**
 * Composable pour gérer les catégories
 * Utilise les utilitaires partagés pour la gestion d'erreurs
 * Inclut l'authentification JWT
 */

import type { Category, CategoryWithCount } from '~/types/todo'
import type { ApiResponse } from '~/types/api'
import { REQUEST_TIMEOUT } from '~/constants/api'

export function useCategories() {
  const { t } = useI18n()
  const { getErrorMessage, logError } = useApiError()
  const { getAuthHeaders, isAuthError, handleAuthError } = useAuth()

  // State réactif
  const categories = ref<CategoryWithCount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Race condition protection
  let currentFetchRequestId = 0
  const pendingOperations = new Map<string, Promise<unknown>>()

  /**
   * Récupérer les catégories depuis l'API
   * Protégé contre les race conditions
   */
  async function fetchCategories(): Promise<void> {
    const requestId = ++currentFetchRequestId

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ApiResponse<CategoryWithCount[]>>('/api/categories', {
        timeout: REQUEST_TIMEOUT,
        headers: getAuthHeaders()
      })

      // Race condition guard: only update if this is the latest request
      if (requestId !== currentFetchRequestId) {
        return
      }

      if (response.success && response.data) {
        categories.value = response.data
      } else {
        error.value = t('errors.fetchError')
      }
    } catch (err: unknown) {
      if (requestId === currentFetchRequestId) {
        if (isAuthError(err)) {
          handleAuthError()
          return
        }
        error.value = getErrorMessage(err, 'errors.fetchError')
        logError(err, 'useCategories.fetchCategories')
      }
    } finally {
      if (requestId === currentFetchRequestId) {
        loading.value = false
      }
    }
  }

  /**
   * Trouver une catégorie par ID
   */
  function getCategoryById(id: string): CategoryWithCount | undefined {
    return categories.value.find(c => c.id === id)
  }

  /**
   * Trouver une catégorie par nom
   */
  function getCategoryByName(name: string): CategoryWithCount | undefined {
    return categories.value.find(c => c.name.toLowerCase() === name.toLowerCase())
  }

  /**
   * Initialiser les catégories avec des données (utile pour l'hydratation SSR)
   */
  function setCategories(data: CategoryWithCount[]): void {
    categories.value = data
  }

  /**
   * Créer une nouvelle catégorie
   */
  async function createCategory(data: {
    name: string
    color: string
    icon?: string
  }): Promise<Category | null> {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ApiResponse<Category>>('/api/categories', {
        method: 'POST',
        body: data,
        timeout: REQUEST_TIMEOUT,
        headers: getAuthHeaders()
      })

      if (response.success && response.data) {
        // Ajouter avec todosCount = 0 pour les nouvelles catégories
        categories.value = [
          ...categories.value,
          { ...response.data, todosCount: 0 }
        ]
        return response.data
      } else {
        error.value = t('errors.createError')
        return null
      }
    } catch (err: unknown) {
      if (isAuthError(err)) {
        handleAuthError()
        return null
      }
      error.value = getErrorMessage(err, 'errors.createError')
      logError(err, 'useCategories.createCategory')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Mettre à jour une catégorie
   * Protégé contre les opérations concurrentes sur la même catégorie
   */
  async function updateCategory(
    id: string,
    data: { name?: string; color?: string; icon?: string }
  ): Promise<Category | null> {
    // Wait for any pending operation on this item
    const existingOperation = pendingOperations.get(id)
    if (existingOperation) {
      await existingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    const operationPromise = (async () => {
      try {
        const response = await $fetch<ApiResponse<Category>>(`/api/categories/${id}`, {
          method: 'PUT',
          body: data,
          timeout: REQUEST_TIMEOUT,
          headers: getAuthHeaders()
        })

        if (response.success && response.data) {
          categories.value = categories.value.map(c =>
            c.id === id ? { ...c, ...response.data! } : c
          )
          return response.data
        } else {
          error.value = t('errors.updateError')
          return null
        }
      } catch (err: unknown) {
        if (isAuthError(err)) {
          handleAuthError()
          return null
        }
        error.value = getErrorMessage(err, 'errors.updateError')
        logError(err, 'useCategories.updateCategory')
        return null
      } finally {
        loading.value = false
        pendingOperations.delete(id)
      }
    })()

    pendingOperations.set(id, operationPromise)
    return operationPromise
  }

  /**
   * Supprimer une catégorie
   * Protégé contre les opérations concurrentes sur la même catégorie
   */
  async function deleteCategory(id: string): Promise<boolean> {
    // Wait for any pending operation on this item
    const existingOperation = pendingOperations.get(id)
    if (existingOperation) {
      await existingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    const operationPromise = (async () => {
      try {
        const response = await $fetch<ApiResponse<{ deleted: boolean }>>(
          `/api/categories/${id}`,
          {
            method: 'DELETE',
            timeout: REQUEST_TIMEOUT,
            headers: getAuthHeaders()
          }
        )

        if (response.success) {
          categories.value = categories.value.filter(c => c.id !== id)
          return true
        } else {
          error.value = t('errors.deleteError')
          return false
        }
      } catch (err: unknown) {
        if (isAuthError(err)) {
          handleAuthError()
          return false
        }
        error.value = getErrorMessage(err, 'errors.deleteError')
        logError(err, 'useCategories.deleteCategory')
        return false
      } finally {
        loading.value = false
        pendingOperations.delete(id)
      }
    })()

    pendingOperations.set(id, operationPromise)
    return operationPromise
  }

  /**
   * Obtenir les infos de suppression (nombre de todos associés)
   */
  async function getDeleteInfo(id: string): Promise<{ todosCount: number } | null> {
    try {
      const response = await $fetch<ApiResponse<{ todosCount: number }>>(
        `/api/categories/${id}/delete-info`,
        {
          timeout: REQUEST_TIMEOUT,
          headers: getAuthHeaders()
        }
      )

      if (response.success && response.data) {
        return response.data
      }
      return null
    } catch (err: unknown) {
      logError(err, 'useCategories.getDeleteInfo')
      return null
    }
  }

  // Computed pour exposer les catégories de manière réactive
  const categoriesComputed = computed(() => categories.value)

  return {
    categories: categoriesComputed,
    loading: readonly(loading),
    error: readonly(error),
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getDeleteInfo,
    getCategoryById,
    getCategoryByName,
    setCategories
  }
}
