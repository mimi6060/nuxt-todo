<script setup lang="ts">
/**
 * Composant TodoStats - Affiche les statistiques des todos
 * Avec accessibilité améliorée pour la progress bar
 */

import type { TodoStats, Category, Priority } from '~/types/todo'
import { getIconEmoji } from '~/constants/icons'
import { STAT_CARDS } from '~/constants/stats'
import { PRIORITY_DOT_COLORS } from '~/constants/priorities'

interface Props {
  stats: TodoStats
  categories: Category[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  editCategory: [category: Category]
}>()

// Pourcentage de completion
const completionRate = computed(() => {
  if (props.stats.total === 0) return 0
  return Math.round((props.stats.completed / props.stats.total) * 100)
})

// Cartes de statistiques (mapping config statique -> données dynamiques)
const statCards = computed(() =>
  STAT_CARDS.map(card => ({
    ...card,
    label: t(card.labelKey),
    value: props.stats[card.key],
  }))
)
</script>

<template>
  <div class="space-y-4">
    <!-- Cartes de stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="card in statCards"
        :key="card.label"
        :class="card.color"
        class="rounded-lg p-3 shadow-sm text-center flex flex-col items-center justify-between h-[100px]"
      >
        <p class="text-xs font-medium opacity-80 leading-tight">{{ card.label }}</p>
        <p class="text-2xl font-bold">{{ card.value }}</p>
        <span class="text-lg" aria-hidden="true">{{ card.icon }}</span>
      </div>
    </div>

    <!-- Barre de progression -->
    <div class="card-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">{{ t('stats.progression') }}</span>
        <span class="text-sm font-bold text-blue-600">{{ completionRate }}%</span>
      </div>
      <div
        class="w-full bg-gray-200 rounded-full h-3"
        role="progressbar"
        :aria-valuenow="completionRate"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`${t('stats.progression')}: ${completionRate}%`"
      >
        <div
          class="bg-blue-600 h-3 rounded-full transition-all duration-300"
          :style="{ width: `${completionRate}%` }"
        />
      </div>
    </div>

    <!-- Statistiques par priorité -->
    <div class="card-sm">
      <h3 class="text-sm font-medium text-gray-700 mb-3">{{ t('stats.byPriority') }}</h3>
      <div class="space-y-2">
        <div
          v-for="(count, priority) in stats.byPriority"
          :key="priority"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="PRIORITY_DOT_COLORS[priority as Priority]"
              aria-hidden="true"
            />
            <span class="text-sm text-gray-600">{{ t(`priority.${priority}`) }}</span>
          </div>
          <span class="text-sm font-medium text-gray-900">{{ count }}</span>
        </div>
      </div>
    </div>

    <!-- Statistiques par catégorie -->
    <div class="card-sm">
      <h3 class="text-sm font-medium text-gray-700 mb-3">{{ t('stats.byCategory') }}</h3>
      <div class="space-y-2">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="emit('editCategory', cat)"
          class="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors group"
          :aria-label="`${t('common.edit')} ${cat.name}`"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm" aria-hidden="true">{{ getIconEmoji(cat.icon) }}</span>
            <span class="text-sm text-gray-600 group-hover:text-gray-900">{{ cat.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-900">{{ stats.byCategory[cat.name] || 0 }}</span>
            <svg
              class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
