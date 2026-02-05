/**
 * Constantes pour les filtres et le tri
 * Source unique de vérité - tout est dérivé
 */

// ============================================
// TYPES
// ============================================

/** Interface pour les options de filtre statut */
export interface StatusFilterOption {
  value: StatusFilter
  labelKey: string
}

/** Interface pour les options de tri */
export interface SortByOption {
  value: SortBy
  labelKey: string
}

/** Interface pour les options d'ordre */
export interface SortOrderOption {
  value: SortOrder
  labelKey: string
  multiplier: number
}

// ============================================
// SOURCE DE DONNÉES - FILTRES STATUT
// ============================================

/**
 * Configuration des filtres de statut
 */
export const STATUS_FILTERS = {
  all: {
    labelKey: 'filter.statusAll',
  },
  active: {
    labelKey: 'filter.statusActive',
    filter: (completed: boolean) => !completed,
  },
  completed: {
    labelKey: 'filter.statusCompleted',
    filter: (completed: boolean) => completed,
  },
} as const

// ============================================
// SOURCE DE DONNÉES - TRI
// ============================================

/**
 * Configuration des options de tri
 * Note: "priority" retiré car il y a déjà un filtre dédié pour la priorité
 */
export const SORT_BY_OPTIONS = {
  createdAt: {
    labelKey: 'filter.sortCreatedAt',
  },
  deadline: {
    labelKey: 'filter.sortDeadline',
  },
  title: {
    labelKey: 'filter.sortTitle',
  },
} as const

/**
 * Configuration de l'ordre de tri
 */
export const SORT_ORDERS = {
  asc: {
    labelKey: 'filter.sortAsc',
    multiplier: 1,
  },
  desc: {
    labelKey: 'filter.sortDesc',
    multiplier: -1,
  },
} as const

// ============================================
// TYPES DÉRIVÉS
// ============================================

/** Type StatusFilter dérivé des clés */
export type StatusFilter = keyof typeof STATUS_FILTERS

/** Type SortBy dérivé des clés */
export type SortBy = keyof typeof SORT_BY_OPTIONS

/** Type SortOrder dérivé des clés */
export type SortOrder = keyof typeof SORT_ORDERS

// ============================================
// VALEURS DÉRIVÉES
// ============================================

/** Liste des valeurs de statut */
export const STATUS_FILTER_VALUES = Object.keys(STATUS_FILTERS) as StatusFilter[]

/** Options pour les selects de statut */
export const STATUS_FILTER_OPTIONS: StatusFilterOption[] = STATUS_FILTER_VALUES.map((value) => ({
  value,
  labelKey: STATUS_FILTERS[value].labelKey,
}))

/** Liste des valeurs de tri */
export const SORT_BY_VALUES = Object.keys(SORT_BY_OPTIONS) as SortBy[]

/** Options pour les selects de tri */
export const SORT_BY_SELECT_OPTIONS: SortByOption[] = SORT_BY_VALUES.map((value) => ({
  value,
  labelKey: SORT_BY_OPTIONS[value].labelKey,
}))

/** Liste des valeurs d'ordre */
export const SORT_ORDER_VALUES = Object.keys(SORT_ORDERS) as SortOrder[]

/** Options pour les selects d'ordre */
export const SORT_ORDER_OPTIONS: SortOrderOption[] = SORT_ORDER_VALUES.map((value) => ({
  value,
  labelKey: SORT_ORDERS[value].labelKey,
  multiplier: SORT_ORDERS[value].multiplier,
}))

/** Map pour toggle rapide de l'ordre */
export const NEXT_SORT_ORDER: Record<SortOrder, SortOrder> = {
  asc: 'desc',
  desc: 'asc',
}

// ============================================
// DÉFAUTS
// ============================================

/** Filtre de statut par défaut */
export const DEFAULT_STATUS_FILTER: StatusFilter = 'all'

/** Tri par défaut */
export const DEFAULT_SORT_BY: SortBy = 'createdAt'

/** Ordre par défaut */
export const DEFAULT_SORT_ORDER: SortOrder = 'desc'

// ============================================
// FONCTIONS HELPERS
// ============================================

/**
 * Obtenir le multiplicateur de tri pour un ordre donné
 */
export function getSortMultiplier(order: SortOrder): number {
  return SORT_ORDERS[order].multiplier
}

/**
 * Toggle l'ordre de tri (asc <-> desc)
 */
export function toggleSortOrder(current: SortOrder): SortOrder {
  return NEXT_SORT_ORDER[current]
}

/**
 * Vérifier si un filtre de statut est valide
 */
export function isValidStatusFilter(value: string | null): value is StatusFilter {
  return value !== null && value in STATUS_FILTERS
}

/**
 * Vérifier si une option de tri est valide
 */
export function isValidSortBy(value: string | null): value is SortBy {
  return value !== null && value in SORT_BY_OPTIONS
}
