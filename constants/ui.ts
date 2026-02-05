/**
 * Constantes pour les styles UI (modals, alerts, etc.)
 * Source unique de vérité - les emojis sont importés depuis icons.ts
 */

import { VARIANT_EMOJIS, type VariantEmojiKey } from './icons'

// ============================================
// TYPES
// ============================================

/** Interface pour la config d'une variante */
export interface VariantConfig {
  iconBg: string
  button: string
}

/** Interface pour les styles de variante avec icône */
export interface VariantStyle {
  icon: string
  iconBg: string
  button: string
}

// ============================================
// SOURCE DE DONNÉES
// ============================================

/**
 * Configuration des variantes de modal/alert
 * Les icônes sont définies dans VARIANT_EMOJIS (icons.ts)
 */
export const VARIANTS = {
  danger: {
    iconBg: 'bg-red-100',
    button: 'btn-danger',
  },
  warning: {
    iconBg: 'bg-yellow-100',
    button: 'btn-warning',
  },
  info: {
    iconBg: 'bg-blue-100',
    button: 'btn-primary',
  },
} as const

// ============================================
// TYPES DÉRIVÉS
// ============================================

/** Type ModalVariant dérivé des clés de VARIANTS */
export type ModalVariant = keyof typeof VARIANTS

// ============================================
// VALEURS DÉRIVÉES
// ============================================

/** Liste des clés de variantes */
export const VARIANT_KEYS = Object.keys(VARIANTS) as ModalVariant[]

/** Liste des variantes avec icônes */
export const VARIANT_STYLES: Record<ModalVariant, VariantStyle> = Object.fromEntries(
  VARIANT_KEYS.map((key) => [
    key,
    {
      ...VARIANTS[key],
      icon: VARIANT_EMOJIS[key as VariantEmojiKey],
    },
  ])
) as Record<ModalVariant, VariantStyle>

// ============================================
// DÉFAUTS
// ============================================

/** Variante par défaut */
export const DEFAULT_VARIANT: ModalVariant = 'danger'

// ============================================
// FONCTIONS HELPERS
// ============================================

/**
 * Obtenir les styles d'une variante avec son emoji
 */
export function getVariantStyle(variant: ModalVariant): VariantStyle {
  return {
    ...VARIANTS[variant],
    icon: VARIANT_EMOJIS[variant as VariantEmojiKey],
  }
}

/**
 * Obtenir uniquement l'icône d'une variante
 */
export function getVariantIcon(variant: ModalVariant): string {
  return VARIANT_EMOJIS[variant as VariantEmojiKey]
}

/**
 * Vérifier si une variante est valide
 */
export function isValidVariant(value: string | null): value is ModalVariant {
  return value !== null && value in VARIANTS
}
