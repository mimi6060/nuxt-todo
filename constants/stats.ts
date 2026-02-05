/**
 * Constantes pour les cartes de statistiques
 * Source unique de vérité - les emojis sont importés depuis icons.ts
 */

import { STAT_EMOJIS, type StatEmojiKey } from './icons'

// ============================================
// TYPES
// ============================================

/** Interface pour la config d'une stat */
export interface StatConfig {
  labelKey: string
  color: string
}

/** Interface pour les cartes de stats avec icône */
export interface StatCardConfig {
  key: StatKey
  labelKey: string
  color: string
  icon: string
}

// ============================================
// SOURCE DE DONNÉES
// ============================================

/**
 * Configuration des statistiques
 * Les icônes sont définies dans STAT_EMOJIS (icons.ts)
 */
export const STATS = {
  total: {
    labelKey: 'stats.total',
    color: 'bg-blue-50 text-blue-700',
  },
  active: {
    labelKey: 'stats.active',
    color: 'bg-green-50 text-green-700',
  },
  completed: {
    labelKey: 'stats.completed',
    color: 'bg-purple-50 text-purple-700',
  },
  overdue: {
    labelKey: 'stats.overdue',
    color: 'bg-red-50 text-red-700',
  },
} as const

// ============================================
// TYPES DÉRIVÉS
// ============================================

/** Type StatKey dérivé des clés de STATS */
export type StatKey = keyof typeof STATS

// ============================================
// VALEURS DÉRIVÉES
// ============================================

/** Liste des clés de stats */
export const STAT_KEYS = Object.keys(STATS) as StatKey[]

/** Liste des cartes de stats avec icônes (dérivée) */
export const STAT_CARDS: StatCardConfig[] = STAT_KEYS.map((key) => ({
  key,
  labelKey: STATS[key].labelKey,
  color: STATS[key].color,
  icon: STAT_EMOJIS[key as StatEmojiKey],
}))

// ============================================
// FONCTIONS HELPERS
// ============================================

/**
 * Obtenir la config d'une stat avec son emoji
 */
export function getStatConfig(key: StatKey): StatConfig & { icon: string } {
  return {
    ...STATS[key],
    icon: STAT_EMOJIS[key as StatEmojiKey],
  }
}

/**
 * Obtenir uniquement l'icône d'une stat
 */
export function getStatIcon(key: StatKey): string {
  return STAT_EMOJIS[key as StatEmojiKey]
}
