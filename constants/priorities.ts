/**
 * Constantes pour les priorités
 * Source unique de vérité - tout est dérivé de PRIORITIES
 */

// ============================================
// TYPES
// ============================================

/** Interface pour les options de priorité (utilisé dans les selects) */
export interface PriorityOption {
  value: Priority
  labelKey: string
  color: string
}

/** Interface pour la config complète d'une priorité */
export interface PriorityConfig {
  labelKey: string
  textColor: string
  badgeColor: string
  dotColor: string
}

// ============================================
// SOURCE DE DONNÉES
// ============================================

/**
 * Configuration complète des priorités
 * Toutes les propriétés sont définies ici, le reste est dérivé
 */
export const PRIORITIES = {
  LOW: {
    labelKey: 'priority.LOW',
    textColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-700',
    dotColor: 'bg-gray-500',
  },
  MEDIUM: {
    labelKey: 'priority.MEDIUM',
    textColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
    dotColor: 'bg-blue-500',
  },
  HIGH: {
    labelKey: 'priority.HIGH',
    textColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-700',
    dotColor: 'bg-orange-500',
  },
  URGENT: {
    labelKey: 'priority.URGENT',
    textColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    dotColor: 'bg-red-500',
  },
} as const

// ============================================
// TYPES DÉRIVÉS
// ============================================

/** Type Priority dérivé des clés de PRIORITIES */
export type Priority = keyof typeof PRIORITIES

// ============================================
// VALEURS DÉRIVÉES
// ============================================

/** Liste des clés de priorité */
export const PRIORITY_KEYS = Object.keys(PRIORITIES) as Priority[]

/** Liste des priorités pour les filtres (avec 'all') */
export const PRIORITY_VALUES: (Priority | 'all')[] = ['all', ...PRIORITY_KEYS]

/** Options pour les selects de priorité */
export const PRIORITY_OPTIONS: PriorityOption[] = PRIORITY_KEYS.map((value) => ({
  value,
  labelKey: PRIORITIES[value].labelKey,
  color: PRIORITIES[value].textColor,
}))

/** Couleurs de badge par priorité */
export const PRIORITY_BADGE_COLORS: Record<Priority, string> = Object.fromEntries(
  PRIORITY_KEYS.map((key) => [key, PRIORITIES[key].badgeColor])
) as Record<Priority, string>

/** Couleurs de dot par priorité */
export const PRIORITY_DOT_COLORS: Record<Priority, string> = Object.fromEntries(
  PRIORITY_KEYS.map((key) => [key, PRIORITIES[key].dotColor])
) as Record<Priority, string>

/** Ordre numérique des priorités pour le tri (LOW=1, MEDIUM=2, HIGH=3, URGENT=4) */
export const PRIORITY_ORDER: Record<Priority, number> = Object.fromEntries(
  PRIORITY_KEYS.map((key, index) => [key, index + 1])
) as Record<Priority, number>

// ============================================
// DÉFAUTS
// ============================================

/** Priorité par défaut */
export const DEFAULT_PRIORITY: Priority = 'MEDIUM'

// ============================================
// FONCTIONS HELPERS
// ============================================

/**
 * Obtenir la config complète d'une priorité
 */
export function getPriorityConfig(value: Priority): PriorityConfig {
  return PRIORITIES[value]
}

/**
 * Trouver une option de priorité par sa valeur
 */
export function findPriority(value: Priority | null): PriorityOption | null {
  if (!value || !(value in PRIORITIES)) return null
  return PRIORITY_OPTIONS.find((p) => p.value === value) || null
}

/**
 * Vérifier si une valeur est une priorité valide
 */
export function isValidPriority(value: string | null): value is Priority {
  return value !== null && value in PRIORITIES
}
