/**
 * Composable pour gérer les tags
 * Utilise les utilitaires partagés pour la gestion d'erreurs
 */

import type { Tag } from '~/types/todo'
import type { ApiResponse } from '~/types/api'
import { REQUEST_TIMEOUT } from '~/constants/api'

// ============================================
// TYPES
// ============================================

export interface TagWithCount extends Tag {
  count: number
}

export interface TagStats {
  totalTags: number
  totalUsage: number
  mostUsed: TagWithCount[]
  leastUsed: TagWithCount[]
}

// ============================================
// COMPOSABLE
// ============================================

export function useTags() {
  const { t } = useI18n()
  const { getErrorMessage, logError } = useApiError()
  const { getAuthHeaders, isAuthError, handleAuthError } = useAuth()

  // State réactif
  const tags = ref<TagWithCount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Race condition protection
  let currentFetchRequestId = 0
  let pendingOperation: Promise<unknown> | null = null

  /**
   * Récupérer tous les tags depuis l'API
   * Protégé contre les race conditions
   */
  async function fetchTags(): Promise<void> {
    const requestId = ++currentFetchRequestId

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ApiResponse<TagWithCount[]>>('/api/tags', {
        timeout: REQUEST_TIMEOUT,
        headers: getAuthHeaders()
      })

      // Race condition guard: only update if this is the latest request
      if (requestId !== currentFetchRequestId) {
        return
      }

      if (response.success && response.data) {
        tags.value = response.data
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
        logError(err, 'useTags.fetchTags')
      }
    } finally {
      if (requestId === currentFetchRequestId) {
        loading.value = false
      }
    }
  }

  /**
   * Obtenir des suggestions de tags pour l'autocomplete
   */
  async function getSuggestions(search: string): Promise<TagWithCount[]> {
    try {
      const response = await $fetch<ApiResponse<TagWithCount[]>>('/api/tags/suggestions', {
        params: { search },
        timeout: REQUEST_TIMEOUT,
        headers: getAuthHeaders()
      })

      if (response.success && response.data) {
        return response.data
      }
      return []
    } catch (err: unknown) {
      logError(err, 'useTags.getSuggestions')
      return []
    }
  }

  /**
   * Obtenir les statistiques des tags
   */
  async function getStats(): Promise<TagStats | null> {
    try {
      const response = await $fetch<ApiResponse<TagStats>>('/api/tags/stats', {
        timeout: REQUEST_TIMEOUT,
        headers: getAuthHeaders()
      })

      if (response.success && response.data) {
        return response.data
      }
      return null
    } catch (err: unknown) {
      logError(err, 'useTags.getStats')
      return null
    }
  }

  /**
   * Renommer un tag dans tous les todos
   * Protégé contre les opérations concurrentes
   */
  async function renameTag(oldName: string, newName: string): Promise<number> {
    // Wait for any pending operation to complete
    if (pendingOperation) {
      await pendingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    pendingOperation = (async () => {
      try {
        const response = await $fetch<ApiResponse<{ updated: number }>>(
          `/api/tags/${encodeURIComponent(oldName)}`,
          {
            method: 'PUT',
            body: { name: newName },
            timeout: REQUEST_TIMEOUT,
            headers: getAuthHeaders()
          }
        )

        if (response.success && response.data) {
          // Mettre à jour la liste locale
          tags.value = tags.value.map(tag =>
            tag.name === oldName ? { ...tag, name: newName } : tag
          )
          return response.data.updated
        }
        return 0
      } catch (err: unknown) {
        if (isAuthError(err)) {
          handleAuthError()
          return 0
        }
        error.value = getErrorMessage(err, 'errors.updateError')
        logError(err, 'useTags.renameTag')
        return 0
      } finally {
        loading.value = false
        pendingOperation = null
      }
    })()

    return pendingOperation as Promise<number>
  }

  /**
   * Supprimer un tag de tous les todos
   * Protégé contre les opérations concurrentes
   */
  async function deleteTag(name: string): Promise<number> {
    // Wait for any pending operation to complete
    if (pendingOperation) {
      await pendingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    pendingOperation = (async () => {
      try {
        const response = await $fetch<ApiResponse<{ updated: number }>>(
          `/api/tags/${encodeURIComponent(name)}`,
          {
            method: 'DELETE',
            timeout: REQUEST_TIMEOUT,
            headers: getAuthHeaders()
          }
        )

        if (response.success && response.data) {
          // Retirer de la liste locale
          tags.value = tags.value.filter(tag => tag.name !== name)
          return response.data.updated
        }
        return 0
      } catch (err: unknown) {
        if (isAuthError(err)) {
          handleAuthError()
          return 0
        }
        error.value = getErrorMessage(err, 'errors.deleteError')
        logError(err, 'useTags.deleteTag')
        return 0
      } finally {
        loading.value = false
        pendingOperation = null
      }
    })()

    return pendingOperation as Promise<number>
  }

  /**
   * Fusionner plusieurs tags en un seul
   * Protégé contre les opérations concurrentes
   */
  async function mergeTags(sourceTags: string[], targetTag: string): Promise<number> {
    // Wait for any pending operation to complete
    if (pendingOperation) {
      await pendingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    pendingOperation = (async () => {
      try {
        const response = await $fetch<ApiResponse<{ updated: number }>>('/api/tags/merge', {
          method: 'POST',
          body: { sourceTags, targetTag },
          timeout: REQUEST_TIMEOUT,
          headers: getAuthHeaders()
        })

        if (response.success && response.data) {
          // Recharger les tags
          await fetchTags()
          return response.data.updated
        }
        return 0
      } catch (err: unknown) {
        if (isAuthError(err)) {
          handleAuthError()
          return 0
        }
        error.value = getErrorMessage(err, 'errors.updateError')
        logError(err, 'useTags.mergeTags')
        return 0
      } finally {
        loading.value = false
        pendingOperation = null
      }
    })()

    return pendingOperation as Promise<number>
  }

  /**
   * Ajouter un tag à la liste locale (pour mise à jour immédiate)
   */
  function addTagLocally(tagName: string): void {
    const existing = tags.value.find(t => t.name === tagName)
    if (existing) {
      // Incrémenter le compteur
      tags.value = tags.value.map(t =>
        t.name === tagName ? { ...t, count: t.count + 1 } : t
      )
    } else {
      // Ajouter nouveau tag avec un ID temporaire
      const newTag: TagWithCount = {
        id: `temp-${Date.now()}`,
        name: tagName,
        color: null,
        createdAt: new Date().toISOString(),
        count: 1
      }
      tags.value = [...tags.value, newTag].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    }
  }

  /**
   * Filtrer les tags par recherche
   */
  function filterTags(search: string): TagWithCount[] {
    if (!search) return tags.value
    const searchLower = search.toLowerCase()
    return tags.value.filter(tag => tag.name.toLowerCase().includes(searchLower))
  }

  /**
   * Obtenir les noms de tags uniquement (pour compatibilité)
   */
  const tagNames = computed(() => tags.value.map(t => t.name))

  return {
    tags: computed(() => tags.value),
    tagNames,
    loading: readonly(loading),
    error: readonly(error),
    fetchTags,
    getSuggestions,
    getStats,
    renameTag,
    deleteTag,
    mergeTags,
    addTagLocally,
    filterTags
  }
}
