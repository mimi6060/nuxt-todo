/**
 * Composable pour gérer les modals de confirmation
 * Permet d'utiliser une Promise pour attendre la réponse de l'utilisateur
 * Utilise i18n pour les textes par défaut
 */

import type { ConfirmModalOptions } from '~/types/ui'

export function useConfirmModal() {
  const { t } = useI18n()

  const isOpen = ref(false)
  const options = ref<ConfirmModalOptions>({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    variant: 'danger',
  })

  let resolvePromise: ((value: boolean) => void) | null = null

  /**
   * Ouvre la modal et retourne une Promise
   * qui se résout à true si l'utilisateur confirme, false sinon
   */
  function confirm(opts: ConfirmModalOptions): Promise<boolean> {
    options.value = {
      title: opts.title || t('confirm.title'),
      message: opts.message,
      confirmText: opts.confirmText || t('common.confirm'),
      cancelText: opts.cancelText || t('common.cancel'),
      variant: opts.variant || 'danger',
    }
    isOpen.value = true

    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  /**
   * Appelé quand l'utilisateur confirme
   */
  function handleConfirm() {
    isOpen.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  /**
   * Appelé quand l'utilisateur annule
   */
  function handleCancel() {
    isOpen.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    isOpen: readonly(isOpen),
    options: readonly(options),
    confirm,
    handleConfirm,
    handleCancel,
  }
}
