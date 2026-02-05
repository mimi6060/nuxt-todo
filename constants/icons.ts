/**
 * Constantes pour les icônes et emojis
 * Source unique de vérité pour toute l'application
 */

import type { FunctionalComponent } from 'vue'
import {
  BriefcaseIcon,
  UserIcon,
  ShoppingCartIcon,
  HeartIcon,
  BookOpenIcon,
  HomeIcon,
  TruckIcon,
  GiftIcon,
  MusicalNoteIcon,
  CurrencyDollarIcon,
} from '@heroicons/vue/24/outline'

// ============================================
// TYPES
// ============================================

export interface IconOption {
  value: string
  /** Clé i18n pour le label (ex: 'icon.briefcase') */
  labelKey: string
  emoji: string
  /** Composant Heroicon correspondant */
  component: FunctionalComponent
}

export type EmojiKey = keyof typeof EMOJIS
export type StatEmojiKey = keyof typeof STAT_EMOJIS
export type VariantEmojiKey = keyof typeof VARIANT_EMOJIS

// ============================================
// EMOJIS SYSTÈME (source unique)
// ============================================

/**
 * Tous les emojis système - chaque emoji défini UNE SEULE fois
 */
export const EMOJIS = {
  // Catégories
  briefcase: '💼',
  user: '👤',
  shoppingCart: '🛒',
  heart: '❤️',
  bookOpen: '📚',
  home: '🏠',
  car: '🚗',
  gift: '🎁',
  music: '🎵',
  dollar: '💰',
  // Stats
  clipboard: '📋',
  hourglass: '⏳',
  checkmark: '✅',
  // Alertes
  warning: '⚠️',
  lightning: '⚡',
  info: 'ℹ️',
} as const

// ============================================
// ICÔNES CATÉGORIES
// ============================================

/**
 * Icônes disponibles pour les catégories
 */
export const AVAILABLE_ICONS: IconOption[] = [
  { value: 'briefcase', labelKey: 'icon.briefcase', emoji: EMOJIS.briefcase, component: BriefcaseIcon },
  { value: 'user', labelKey: 'icon.user', emoji: EMOJIS.user, component: UserIcon },
  { value: 'shopping-cart', labelKey: 'icon.shoppingCart', emoji: EMOJIS.shoppingCart, component: ShoppingCartIcon },
  { value: 'heart', labelKey: 'icon.heart', emoji: EMOJIS.heart, component: HeartIcon },
  { value: 'book-open', labelKey: 'icon.bookOpen', emoji: EMOJIS.bookOpen, component: BookOpenIcon },
  { value: 'home', labelKey: 'icon.home', emoji: EMOJIS.home, component: HomeIcon },
  { value: 'car', labelKey: 'icon.car', emoji: EMOJIS.car, component: TruckIcon },
  { value: 'gift', labelKey: 'icon.gift', emoji: EMOJIS.gift, component: GiftIcon },
  { value: 'music', labelKey: 'icon.music', emoji: EMOJIS.music, component: MusicalNoteIcon },
  { value: 'dollar', labelKey: 'icon.dollar', emoji: EMOJIS.dollar, component: CurrencyDollarIcon },
]

// ============================================
// MAPPINGS DÉRIVÉS
// ============================================

/** Map emoji par valeur d'icône */
export const ICON_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  AVAILABLE_ICONS.map(icon => [icon.value, icon.emoji])
)

/** Map composant Heroicon par valeur d'icône */
export const ICON_COMPONENT_MAP: Record<string, FunctionalComponent> = Object.fromEntries(
  AVAILABLE_ICONS.map(icon => [icon.value, icon.component])
)

/** Emojis pour les statistiques (dérivé de EMOJIS) */
export const STAT_EMOJIS = {
  total: EMOJIS.clipboard,
  active: EMOJIS.hourglass,
  completed: EMOJIS.checkmark,
  overdue: EMOJIS.warning,
} as const

/** Emojis pour les variantes modal/alert (dérivé de EMOJIS) */
export const VARIANT_EMOJIS = {
  danger: EMOJIS.warning,
  warning: EMOJIS.lightning,
  info: EMOJIS.info,
} as const

// ============================================
// DÉFAUTS
// ============================================

/** Icône par défaut (première de la liste) */
export const DEFAULT_ICON = AVAILABLE_ICONS[0]

// ============================================
// FONCTIONS HELPERS
// ============================================

/**
 * Trouver une icône par sa valeur
 */
export function findIcon(iconName: string | null): IconOption | null {
  if (!iconName) return null
  return AVAILABLE_ICONS.find(i => i.value === iconName) || null
}

/**
 * Obtenir l'emoji correspondant à un nom d'icône
 * @param fallback - Si true, retourne l'icône par défaut au lieu de null
 */
export function getIconEmoji(iconName: string | null, fallback = true): string | null {
  const icon = findIcon(iconName)
  if (icon) return icon.emoji
  return fallback ? DEFAULT_ICON.emoji : null
}

/**
 * Obtenir le composant Heroicon correspondant à un nom d'icône
 * @param fallback - Si true, retourne l'icône par défaut au lieu de null
 */
export function getIconComponent(iconName: string | null, fallback = false): FunctionalComponent | null {
  const icon = findIcon(iconName)
  if (icon) return icon.component
  return fallback ? DEFAULT_ICON.component : null
}
