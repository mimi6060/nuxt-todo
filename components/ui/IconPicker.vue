<script setup lang="ts">
/**
 * Composant IconPicker - Sélecteur d'icônes réutilisable
 */

import type { IconOption } from '~/constants/icons'
import { AVAILABLE_ICONS } from '~/constants/icons'

interface Props {
  modelValue: string
  icons?: IconOption[]
}

const props = withDefaults(defineProps<Props>(), {
  icons: () => AVAILABLE_ICONS,
})

const { t } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectIcon(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div
    class="grid grid-cols-5 gap-2"
    role="radiogroup"
    :aria-label="t('category.icon')"
  >
    <button
      v-for="icon in icons"
      :key="icon.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === icon.value"
      :aria-label="t(icon.labelKey)"
      @click="selectIcon(icon.value)"
      class="p-3 text-xl rounded-lg border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      :class="modelValue === icon.value
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 hover:border-gray-300'"
      :title="t(icon.labelKey)"
    >
      {{ icon.emoji }}
    </button>
  </div>
</template>
