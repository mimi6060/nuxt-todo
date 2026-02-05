/**
 * Composable pour gérer le filtrage et le tri des todos côté SERVEUR
 *
 * Features:
 * - Filtres réactifs qui déclenchent des appels API
 * - Debounce pour la recherche textuelle
 * - Synchronisation avec le store Pinia
 * - Nettoyage automatique des timers
 * - Persistance des filtres dans l'URL (query parameters)
 * - Partage de vues filtrées via URL
 */

import type { Priority } from '~/types/todo'
import type { StatusFilter, SortBy, SortOrder } from '~/constants/filters'
import { SEARCH_DEBOUNCE_DELAY } from '~/constants/api'
import {
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  isValidStatusFilter,
  isValidSortBy,
  SORT_ORDER_VALUES
} from '~/constants/filters'
import { isValidPriority } from '~/constants/priorities'

export interface UseFiltersOptions {
  /** Fonction appelée quand les filtres changent */
  onFiltersChange?: (filters: Record<string, string>) => Promise<void>
  /** Délai de debounce pour la recherche (ms) */
  debounceDelay?: number
  /** Déclencher automatiquement au changement de filtre */
  autoFetch?: boolean
  /** Synchroniser les filtres avec l'URL */
  syncWithUrl?: boolean
}

/**
 * Vérifie si une valeur est un ordre de tri valide
 */
function isValidSortOrder(value: string | null): value is SortOrder {
  return value !== null && SORT_ORDER_VALUES.includes(value as SortOrder)
}

export function useFilters(options: UseFiltersOptions = {}) {
  const {
    onFiltersChange,
    debounceDelay = SEARCH_DEBOUNCE_DELAY,
    autoFetch = true,
    syncWithUrl = true
  } = options

  // Router pour la synchronisation URL
  const route = useRoute()
  const router = useRouter()

  // Flag pour éviter les boucles infinies lors de l'initialisation
  let isInitializing = true
  // Flag pour éviter la mise à jour de l'URL pendant la lecture depuis l'URL
  let isReadingFromUrl = false

  /**
   * Lire les filtres depuis les query params de l'URL
   */
  function readFiltersFromUrl() {
    const query = route.query

    const urlSearch = typeof query.search === 'string' ? query.search : ''
    const urlStatus = typeof query.status === 'string' ? query.status : null
    const urlCategory = typeof query.category === 'string' ? query.category : 'all'
    const urlPriority = typeof query.priority === 'string' ? query.priority : null
    const urlSortBy = typeof query.sortBy === 'string' ? query.sortBy : null
    const urlSortOrder = typeof query.sortOrder === 'string' ? query.sortOrder : null
    const urlOverdue = query.overdue === 'true'

    return {
      search: urlSearch,
      status: isValidStatusFilter(urlStatus) ? urlStatus : DEFAULT_STATUS_FILTER,
      category: urlCategory,
      priority: (urlPriority === 'all' || isValidPriority(urlPriority)) ? urlPriority as Priority | 'all' : 'all',
      sortBy: isValidSortBy(urlSortBy) ? urlSortBy : DEFAULT_SORT_BY,
      sortOrder: isValidSortOrder(urlSortOrder) ? urlSortOrder : DEFAULT_SORT_ORDER,
      overdue: urlOverdue
    }
  }

  // Initialiser les filtres depuis l'URL
  const initialFilters = readFiltersFromUrl()

  // État des filtres (initialisé depuis l'URL)
  const searchQuery = ref(initialFilters.search)
  const debouncedSearchQuery = ref(initialFilters.search)
  const statusFilter = ref<StatusFilter>(initialFilters.status)
  const categoryFilter = ref<string>(initialFilters.category)
  const priorityFilter = ref<Priority | 'all'>(initialFilters.priority)
  const sortBy = ref<SortBy>(initialFilters.sortBy)
  const sortOrder = ref<SortOrder>(initialFilters.sortOrder)
  const showOverdueOnly = ref(initialFilters.overdue)

  // État interne
  const isFiltering = ref(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  // Track current filter request to prevent race conditions
  let currentFilterRequestId = 0

  // Cleanup function pour le timer
  const clearDebounceTimer = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  /**
   * Mettre à jour l'URL avec les filtres actuels
   * N'inclut que les valeurs non-default pour garder l'URL propre
   */
  function updateUrlWithFilters() {
    if (!syncWithUrl || isReadingFromUrl) return

    const query: Record<string, string> = {}

    // Recherche textuelle (utilise la valeur debounced)
    if (debouncedSearchQuery.value.trim()) {
      query.search = debouncedSearchQuery.value.trim()
    }

    // Statut (seulement si différent du défaut)
    if (statusFilter.value !== DEFAULT_STATUS_FILTER) {
      query.status = statusFilter.value
    }

    // Catégorie (seulement si différent de 'all')
    if (categoryFilter.value !== 'all') {
      query.category = categoryFilter.value
    }

    // Priorité (seulement si différent de 'all')
    if (priorityFilter.value !== 'all') {
      query.priority = priorityFilter.value
    }

    // Tri (seulement si différent du défaut)
    if (sortBy.value !== DEFAULT_SORT_BY) {
      query.sortBy = sortBy.value
    }

    // Ordre de tri (seulement si différent du défaut)
    if (sortOrder.value !== DEFAULT_SORT_ORDER) {
      query.sortOrder = sortOrder.value
    }

    // En retard uniquement
    if (showOverdueOnly.value) {
      query.overdue = 'true'
    }

    // Préserver les autres query params existants (comme page)
    const currentQuery = { ...route.query }
    // Supprimer les params de filtres existants pour les remplacer
    delete currentQuery.search
    delete currentQuery.status
    delete currentQuery.category
    delete currentQuery.priority
    delete currentQuery.sortBy
    delete currentQuery.sortOrder
    delete currentQuery.overdue

    // Fusionner avec les nouveaux filtres
    const newQuery = { ...currentQuery, ...query }

    // Utiliser replace pour ne pas ajouter d'entrée dans l'historique à chaque changement
    router.replace({ query: newQuery })
  }

  /**
   * Convertir les filtres en paramètres de query API
   */
  function buildQueryParams(): Record<string, string> {
    const params: Record<string, string> = {}

    // Recherche textuelle (utilise la valeur debounced)
    if (debouncedSearchQuery.value.trim()) {
      params.search = debouncedSearchQuery.value.trim()
    }

    // Statut
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    // Catégorie
    if (categoryFilter.value !== 'all') {
      params.categoryId = categoryFilter.value
    }

    // Priorité
    if (priorityFilter.value !== 'all') {
      params.priority = priorityFilter.value
    }

    // En retard uniquement
    if (showOverdueOnly.value) {
      params.overdue = 'true'
    }

    // Tri
    params.sortBy = sortBy.value
    params.sortOrder = sortOrder.value

    // Toujours commencer à la page 1 quand les filtres changent
    params.page = '1'

    return params
  }

  /**
   * Déclencher le fetch avec les filtres actuels
   * Protégé contre les race conditions: seule la dernière requête met à jour l'état
   */
  async function applyFilters(): Promise<void> {
    if (!onFiltersChange) return

    // Generate unique request ID for race condition protection
    const requestId = ++currentFilterRequestId

    isFiltering.value = true
    try {
      const params = buildQueryParams()
      await onFiltersChange(params)
    } finally {
      // Only clear filtering state if this is still the latest request
      if (requestId === currentFilterRequestId) {
        isFiltering.value = false
      }
    }
  }

  /**
   * Réinitialiser tous les filtres
   */
  async function resetFilters(): Promise<void> {
    clearDebounceTimer()
    searchQuery.value = ''
    debouncedSearchQuery.value = ''
    statusFilter.value = DEFAULT_STATUS_FILTER
    categoryFilter.value = 'all'
    priorityFilter.value = 'all'
    sortBy.value = DEFAULT_SORT_BY
    sortOrder.value = DEFAULT_SORT_ORDER
    showOverdueOnly.value = false

    // Nettoyer l'URL des paramètres de filtres
    if (syncWithUrl) {
      const currentQuery = { ...route.query }
      delete currentQuery.search
      delete currentQuery.status
      delete currentQuery.category
      delete currentQuery.priority
      delete currentQuery.sortBy
      delete currentQuery.sortOrder
      delete currentQuery.overdue
      router.replace({ query: currentQuery })
    }

    if (autoFetch) {
      await applyFilters()
    }
  }

  /**
   * Nombre de filtres actifs (hors tri)
   */
  const activeFiltersCount = computed(() => {
    let count = 0
    if (searchQuery.value) count++
    if (statusFilter.value !== 'all') count++
    if (categoryFilter.value !== 'all') count++
    if (priorityFilter.value !== 'all') count++
    if (showOverdueOnly.value) count++
    return count
  })

  /**
   * Vérifie si des filtres sont actifs
   */
  const hasActiveFilters = computed(() => activeFiltersCount.value > 0)

  // Watch pour debouncer la recherche
  watch(searchQuery, (val) => {
    clearDebounceTimer()
    debounceTimer = setTimeout(async () => {
      debouncedSearchQuery.value = val
      if (!isInitializing) {
        updateUrlWithFilters()
      }
      if (autoFetch) {
        await applyFilters()
      }
    }, debounceDelay)
  })

  // Watch pour les autres filtres (application immédiate)
  watch(
    [statusFilter, categoryFilter, priorityFilter, sortBy, sortOrder, showOverdueOnly],
    async () => {
      if (!isInitializing) {
        updateUrlWithFilters()
      }
      if (autoFetch) {
        await applyFilters()
      }
    }
  )

  // Watch pour les changements d'URL (navigation back/forward, liens partagés)
  watch(
    () => route.query,
    (newQuery) => {
      if (!syncWithUrl) return

      isReadingFromUrl = true

      const urlSearch = typeof newQuery.search === 'string' ? newQuery.search : ''
      const urlStatus = typeof newQuery.status === 'string' ? newQuery.status : null
      const urlCategory = typeof newQuery.category === 'string' ? newQuery.category : 'all'
      const urlPriority = typeof newQuery.priority === 'string' ? newQuery.priority : null
      const urlSortBy = typeof newQuery.sortBy === 'string' ? newQuery.sortBy : null
      const urlSortOrder = typeof newQuery.sortOrder === 'string' ? newQuery.sortOrder : null
      const urlOverdue = newQuery.overdue === 'true'

      // Mettre à jour les filtres si différents
      if (searchQuery.value !== urlSearch) {
        searchQuery.value = urlSearch
        debouncedSearchQuery.value = urlSearch
      }
      if (isValidStatusFilter(urlStatus) && statusFilter.value !== urlStatus) {
        statusFilter.value = urlStatus
      } else if (!urlStatus && statusFilter.value !== DEFAULT_STATUS_FILTER) {
        statusFilter.value = DEFAULT_STATUS_FILTER
      }
      if (categoryFilter.value !== urlCategory) {
        categoryFilter.value = urlCategory
      }
      const validPriority = (urlPriority === 'all' || isValidPriority(urlPriority))
        ? urlPriority as Priority | 'all'
        : 'all'
      if (priorityFilter.value !== validPriority) {
        priorityFilter.value = validPriority
      }
      if (isValidSortBy(urlSortBy) && sortBy.value !== urlSortBy) {
        sortBy.value = urlSortBy
      } else if (!urlSortBy && sortBy.value !== DEFAULT_SORT_BY) {
        sortBy.value = DEFAULT_SORT_BY
      }
      if (isValidSortOrder(urlSortOrder) && sortOrder.value !== urlSortOrder) {
        sortOrder.value = urlSortOrder
      } else if (!urlSortOrder && sortOrder.value !== DEFAULT_SORT_ORDER) {
        sortOrder.value = DEFAULT_SORT_ORDER
      }
      if (showOverdueOnly.value !== urlOverdue) {
        showOverdueOnly.value = urlOverdue
      }

      isReadingFromUrl = false
    },
    { deep: true }
  )

  // Marquer l'initialisation comme terminée après le premier render
  onMounted(() => {
    isInitializing = false
  })

  // Cleanup au démontage
  onUnmounted(() => {
    clearDebounceTimer()
  })

  onScopeDispose(() => {
    clearDebounceTimer()
  })

  return {
    // State
    searchQuery,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    showOverdueOnly,

    // Computed
    activeFiltersCount,
    hasActiveFilters,
    isFiltering: readonly(isFiltering),

    // Methods
    applyFilters,
    resetFilters,
    buildQueryParams
  }
}
