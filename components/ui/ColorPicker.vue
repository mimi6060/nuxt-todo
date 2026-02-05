<script setup lang="ts">
/**
 * Composant ColorPicker - Sélecteur de couleurs réutilisable
 */

import type { ColorOption } from '~/constants/colors'
import { AVAILABLE_COLORS } from '~/constants/colors'

interface Props {
  modelValue: string
  colors?: ColorOption[]
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => AVAILABLE_COLORS,
})

const { t } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectColor(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div
    class="flex flex-wrap gap-2"
    role="radiogroup"
    :aria-label="t('category.color')"
  >
    <button
      v-for="color in colors"
      :key="color.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === color.value"
      :aria-label="t(color.labelKey)"
      @click="selectColor(color.value)"
      class="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
      :class="modelValue === color.value
        ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400'
        : 'border-transparent focus:ring-gray-400'"
      :style="{ backgroundColor: color.value }"
      :title="t(color.labelKey)"
    />
  </div>
</template>
