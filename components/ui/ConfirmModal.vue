<script setup lang="ts">
/**
 * Composant ConfirmModal - Modal de confirmation réutilisable
 * Utilise Headless UI Dialog pour l'accessibilité
 */

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import type { ModalVariant } from '~/types/ui'
import { DEFAULT_VARIANT, getVariantStyle } from '~/constants/ui'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ModalVariant
}

const props = withDefaults(defineProps<Props>(), {
  variant: DEFAULT_VARIANT,
})

const { t } = useI18n()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

// Valeurs par défaut avec i18n
const displayTitle = computed(() => props.title || t('confirm.title'))
const displayConfirmText = computed(() => props.confirmText || t('common.confirm'))
const displayCancelText = computed(() => props.cancelText || t('common.cancel'))

const currentVariant = computed(() => getVariantStyle(props.variant))
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-50" @close="emit('cancel')">
      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/50" aria-hidden="true" />
      </TransitionChild>

      <!-- Modal -->
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="modal-panel">
            <div class="flex items-start gap-4">
              <!-- Icône -->
              <div
                :class="currentVariant.iconBg"
                class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                aria-hidden="true"
              >
                <span class="text-xl">{{ currentVariant.icon }}</span>
              </div>

              <!-- Contenu -->
              <div class="flex-1">
                <DialogTitle
                  as="h3"
                  class="text-lg font-semibold text-gray-900 mb-2"
                >
                  {{ displayTitle }}
                </DialogTitle>

                <p class="text-sm text-gray-600">
                  {{ message }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 mt-6">
              <button
                type="button"
                class="btn-secondary"
                @click="emit('cancel')"
              >
                {{ displayCancelText }}
              </button>
              <button
                type="button"
                :class="['btn', currentVariant.button]"
                @click="emit('confirm')"
              >
                {{ displayConfirmText }}
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
