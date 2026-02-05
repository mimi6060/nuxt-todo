/**
 * Types pour les composants UI
 */

// ModalVariant est défini dans constants/ui.ts (source unique)
export type { ModalVariant } from '~/constants/ui'

// Import pour utilisation locale
import type { ModalVariant } from '~/constants/ui'

/**
 * Options pour le modal de confirmation
 */
export interface ConfirmModalOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ModalVariant
}
