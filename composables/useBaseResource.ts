/**
 * Composable de base pour la gestion de ressources CRUD
 * Fournit une abstraction réutilisable avec:
 * - État réactif
 * - Pagination côté serveur
 * - Filtres côté serveur
 * - Authentification JWT
 * - Protection contre les race conditions
 */

import type { CrudService, UseResourceOptions, PaginationParams, PaginatedResult } from '~/types/services'
import type { PaginationMeta } from '~/types/api'
import { isApiError } from '~/types/guards'

// Re-export pour compatibilité
export type UseBaseResourceOptions<T> = UseResourceOptions<T>

const DEFAULT_ERROR_KEYS = {
  fetch: 'errors.fetchError',
  create: 'errors.createError',
  update: 'errors.updateError',
  delete: 'errors.deleteError',
  timeout: 'errors.timeoutError',
}

export function useBaseResource<T extends { id: string }, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>(
  service: CrudService<T, CreateDTO, UpdateDTO>,
  options: UseBaseResourceOptions<T> = {}
) {
  const {
    getId = (item: T) => item.id,
    autoLoad = false,
    paginated = false,
    errorKeys = {}
  } = options
  const keys = { ...DEFAULT_ERROR_KEYS, ...errorKeys }

  // i18n
  const { t } = useI18n()

  // Race condition protection: track current request ID
  let currentFetchRequestId = 0
  // Track pending operations by item ID to prevent concurrent updates
  const pendingOperations = new Map<string, Promise<unknown>>()

  // Helper pour vérifier si c'est une erreur de timeout
  const isTimeoutError = (err: unknown): boolean => {
    if (err instanceof Error) {
      return err.name === 'TimeoutError' || err.message?.includes('timeout')
    }
    return false
  }

  // Helper pour obtenir le message d'erreur traduit
  const getErrorMessage = (key: string, fallback: string) => {
    try {
      return t(key)
    } catch {
      return fallback
    }
  }

  // Helper pour traiter les erreurs avec support du timeout
  const handleError = (err: unknown, defaultKey: string): string => {
    if (isTimeoutError(err)) {
      return getErrorMessage(keys.timeout, 'Request timeout')
    }
    if (isApiError(err)) {
      return err.data?.code
        ? getErrorMessage(`apiErrors.${err.data.code}`, err.message)
        : getErrorMessage(defaultKey, err.message)
    }
    return getErrorMessage(defaultKey, 'Unknown error')
  }

  // State réactif
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Pagination state (pour mode paginé)
  const pagination = ref<PaginationMeta | null>(null)
  const currentFilters = ref<PaginationParams>({})

  /**
   * Helper pour vérifier si un résultat est paginé
   */
  function isPaginatedResult(result: T[] | PaginatedResult<T>): result is PaginatedResult<T> {
    return result && typeof result === 'object' && 'data' in result && 'meta' in result
  }

  /**
   * Récupérer tous les éléments avec pagination et filtres côté serveur
   * Protégé contre les race conditions: seule la dernière requête met à jour l'état
   * @param params - Paramètres de pagination et filtres
   */
  async function fetchAll(params?: PaginationParams): Promise<PaginationMeta | null> {
    // Generate unique request ID to track this specific request
    const requestId = ++currentFetchRequestId

    loading.value = true
    error.value = null

    // Fusionner avec les filtres actuels si params partiel
    const mergedParams = { ...currentFilters.value, ...params }
    currentFilters.value = mergedParams

    try {
      const result = await service.getAll(mergedParams)

      // Race condition guard: only update state if this is still the latest request
      if (requestId !== currentFetchRequestId) {
        // A newer request was made, discard this result
        return null
      }

      if (isPaginatedResult(result)) {
        // Réponse paginée
        items.value = result.data
        pagination.value = result.meta
        return result.meta
      } else {
        // Réponse simple (tableau)
        items.value = result
        pagination.value = null
        return null
      }
    } catch (err: unknown) {
      // Only set error if this is still the latest request
      if (requestId === currentFetchRequestId) {
        error.value = handleError(err, keys.fetch)
        console.error('Error fetching items:', err)
      }
      return null
    } finally {
      // Only clear loading if this is still the latest request
      if (requestId === currentFetchRequestId) {
        loading.value = false
      }
    }
  }

  /**
   * Changer de page (pagination côté serveur)
   */
  async function goToPage(page: number): Promise<void> {
    await fetchAll({ ...currentFilters.value, page })
  }

  /**
   * Appliquer des filtres (réinitialise à la page 1)
   */
  async function applyFilters(filters: Omit<PaginationParams, 'page'>): Promise<void> {
    await fetchAll({ ...filters, page: 1 })
  }

  /**
   * Réinitialiser les filtres
   */
  async function resetFilters(): Promise<void> {
    currentFilters.value = {}
    await fetchAll({ page: 1 })
  }

  /**
   * Récupérer un élément par ID
   */
  async function fetchById(id: string): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      return await service.getById(id)
    } catch (err: unknown) {
      error.value = handleError(err, keys.fetch)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Créer un élément
   */
  async function create(data: CreateDTO): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const created = await service.create(data)
      if (created) {
        // En mode paginé, rafraîchir pour avoir les bonnes données
        if (paginated) {
          await fetchAll(currentFilters.value)
        } else {
          items.value = [created, ...items.value]
        }
      }
      return created
    } catch (err: unknown) {
      error.value = handleError(err, keys.create)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Mettre à jour un élément
   * Protégé contre les mises à jour concurrentes sur le même élément
   */
  async function update(id: string, data: UpdateDTO): Promise<T | null> {
    // Check if there's already a pending operation on this item
    const existingOperation = pendingOperations.get(id)
    if (existingOperation) {
      // Wait for the existing operation to complete first
      await existingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    const operationPromise = (async () => {
      try {
        const updated = await service.update(id, data)
        if (updated) {
          items.value = items.value.map(item =>
            getId(item) === id ? updated : item
          )
        }
        return updated
      } catch (err: unknown) {
        error.value = handleError(err, keys.update)
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
   * Supprimer un élément
   * Protégé contre les opérations concurrentes sur le même élément
   */
  async function remove(id: string): Promise<boolean> {
    // Check if there's already a pending operation on this item
    const existingOperation = pendingOperations.get(id)
    if (existingOperation) {
      // Wait for the existing operation to complete first
      await existingOperation.catch(() => {})
    }

    loading.value = true
    error.value = null

    const operationPromise = (async () => {
      try {
        const deleted = await service.delete(id)
        if (deleted) {
          items.value = items.value.filter(item => getId(item) !== id)

          // En mode paginé, rafraîchir si nécessaire
          if (paginated && items.value.length === 0 && pagination.value && pagination.value.page > 1) {
            await goToPage(pagination.value.page - 1)
          }
        }
        return deleted
      } catch (err: unknown) {
        error.value = handleError(err, keys.delete)
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
   * Trouver un élément par ID dans le state local
   */
  function findById(id: string): T | undefined {
    return items.value.find(item => getId(item) === id)
  }

  /**
   * Définir les éléments (utile pour l'hydratation SSR)
   */
  function setItems(data: T[]) {
    items.value = data
  }

  /**
   * Définir la pagination (utile pour l'hydratation SSR)
   */
  function setPagination(meta: PaginationMeta | null) {
    pagination.value = meta
  }

  // Computed helpers pour la pagination
  const hasNextPage = computed(() => {
    if (!pagination.value) return false
    return pagination.value.page < pagination.value.totalPages
  })

  const hasPreviousPage = computed(() => {
    if (!pagination.value) return false
    return pagination.value.page > 1
  })

  const currentPage = computed(() => pagination.value?.page ?? 1)
  const totalPages = computed(() => pagination.value?.totalPages ?? 1)
  const totalItems = computed(() => pagination.value?.total ?? items.value.length)

  // Auto-load si demandé
  if (autoLoad) {
    onMounted(() => fetchAll())
  }

  return {
    // State (readonly pour éviter les mutations directes)
    items: computed(() => items.value),
    loading: readonly(loading),
    error: readonly(error),

    // Pagination state
    pagination: readonly(pagination),
    currentFilters: readonly(currentFilters),
    hasNextPage,
    hasPreviousPage,
    currentPage,
    totalPages,
    totalItems,

    // Actions CRUD
    fetchAll,
    fetchById,
    create,
    update,
    remove,
    findById,
    setItems,
    setPagination,

    // Actions pagination
    goToPage,
    applyFilters,
    resetFilters,
  }
}
