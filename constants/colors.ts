/**
 * Constantes pour les couleurs disponibles
 * Source unique de vérité pour les couleurs de catégories
 */

// ============================================
// TYPES
// ============================================

export interface ColorOption {
  value: string
  /** Clé i18n pour le label (ex: 'color.blue') */
  labelKey: string
}

// ============================================
// SOURCE DE DONNÉES
// ============================================

/**
 * Couleurs disponibles pour les catégories
 */
export const AVAILABLE_COLORS: ColorOption[] = [
  { value: '#3B82F6', labelKey: 'color.blue' },
  { value: '#10B981', labelKey: 'color.green' },
  { value: '#F59E0B', labelKey: 'color.orange' },
  { value: '#EF4444', labelKey: 'color.red' },
  { value: '#8B5CF6', labelKey: 'color.purple' },
  { value: '#EC4899', labelKey: 'color.pink' },
  { value: '#06B6D4', labelKey: 'color.cyan' },
  { value: '#6B7280', labelKey: 'color.gray' },
]

// ============================================
// VALEURS DÉRIVÉES
// ============================================

/** Liste des valeurs hex uniquement */
export const COLOR_VALUES = AVAILABLE_COLORS.map(c => c.value)

// ============================================
// DÉFAUTS
// ============================================

/** Couleur par défaut (première de la liste) */
export const DEFAULT_COLOR = AVAILABLE_COLORS[0]

// ============================================
// FONCTIONS HELPERS
// ============================================

/**
 * Trouver une couleur par sa valeur hex
 */
export function findColor(colorValue: string | null): ColorOption | null {
  if (!colorValue) return null
  return AVAILABLE_COLORS.find(c => c.value === colorValue) || null
}

/**
 * Obtenir la valeur hex d'une couleur avec fallback
 * @param fallback - Si true, retourne la couleur par défaut au lieu de null
 */
export function getColorValue(colorValue: string | null, fallback = true): string | null {
  const color = findColor(colorValue)
  if (color) return color.value
  return fallback ? DEFAULT_COLOR.value : null
}

/**
 * Vérifier si une valeur hex est valide
 */
export function isValidColor(colorValue: string | null): boolean {
  return findColor(colorValue) !== null
}
