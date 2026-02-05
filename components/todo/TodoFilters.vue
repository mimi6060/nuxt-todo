<script setup lang="ts">
/**
 * Composant TodoFilters - Barre de recherche et filtres
 * Avec accessibilité améliorée (aria-labels, aria-hidden)
 */

import type { Priority } from '~/types/todo'
import type { StatusFilter, SortBy, SortOrder } from '~/constants/filters'
import { getIconEmoji } from '~/constants/icons'
import { PRIORITY_OPTIONS } from '~/constants/priorities'
import {
  STATUS_FILTER_OPTIONS,
  SORT_BY_SELECT_OPTIONS,
  NEXT_SORT_ORDER,
} from '~/constants/filters'

interface Props {
  activeFiltersCount: number
}

defineProps<Props>()
const { t } = useI18n()

// v-model pour tous les filtres
const searchQuery = defineModel<string>('searchQuery', { required: true })
const statusFilter = defineModel<StatusFilter>('statusFilter', { required: true })
const categoryFilter = defineModel<string>('categoryFilter', { required: true })
const priorityFilter = defineModel<Priority | 'all'>('priorityFilter', { required: true })
const sortBy = defineModel<SortBy>('sortBy', { required: true })
const sortOrder = defineModel<SortOrder>('sortOrder', { required: true })
const showOverdueOnly = defineModel<boolean>('showOverdueOnly', { required: true })

const emit = defineEmits<{
  reset: []
}>()

// Charger les catégories
const { categories, fetchCategories } = useCategories()
onMounted(() => fetchCategories())

// Label du bouton de tri (évite la duplication)
const sortOrderLabel = computed(() =>
  sortOrder.value === 'asc' ? t('filter.sortAsc') : t('filter.sortDesc')
)

// Toggle sort order
function toggleSortOrder() {
  sortOrder.value = NEXT_SORT_ORDER[sortOrder.value]
}
</script>

<template>
  <div class="card-sm space-y-4">
    <!-- Barre de recherche -->
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('filter.searchPlaceholder')"
        class="w-full pl-10 pr-4 py-2 form-input"
        :aria-label="t('filter.searchPlaceholder')"
      />
      <svg
        class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>

    <!-- Filtres -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Statut -->
      <div>
        <label for="status-filter" class="form-label">{{ t('filter.status') }}</label>
        <select
          id="status-filter"
          v-model="statusFilter"
          class="form-select"
        >
          <option v-for="opt in STATUS_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
            {{ t(opt.labelKey) }}
          </option>
        </select>
      </div>

      <!-- Catégorie -->
      <div>
        <label for="category-filter" class="form-label">{{ t('filter.category') }}</label>
        <select
          id="category-filter"
          v-model="categoryFilter"
          class="form-select"
        >
          <option value="all">{{ t('filter.categoryAll') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ getIconEmoji(cat.icon) }} {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Priorité -->
      <div>
        <label for="priority-filter" class="form-label">{{ t('filter.priority') }}</label>
        <select
          id="priority-filter"
          v-model="priorityFilter"
          class="form-select"
        >
          <option value="all">{{ t('filter.priorityAll') }}</option>
          <option v-for="p in PRIORITY_OPTIONS" :key="p.value" :value="p.value">
            {{ t(p.labelKey) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tri et options -->
    <div class="flex flex-wrap items-center gap-4">
      <!-- Tri -->
      <div class="flex items-center gap-2">
        <label for="sort-by" class="text-sm font-medium text-gray-700">{{ t('filter.sortBy') }}:</label>
        <select
          id="sort-by"
          v-model="sortBy"
          class="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option v-for="opt in SORT_BY_SELECT_OPTIONS" :key="opt.value" :value="opt.value">
            {{ t(opt.labelKey) }}
          </option>
        </select>
        <button
          @click="toggleSortOrder"
          class="p-1.5 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          :aria-label="sortOrderLabel"
          :title="sortOrderLabel"
        >
          <svg
            class="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              v-if="sortOrder === 'asc'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <!-- En retard uniquement -->
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          v-model="showOverdueOnly"
          type="checkbox"
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span class="text-sm text-gray-700">{{ t('filter.overdueOnly') }}</span>
      </label>

      <!-- Réinitialiser -->
      <button
        v-if="activeFiltersCount > 0"
        @click="emit('reset')"
        class="ml-auto btn-secondary text-sm py-1.5"
      >
        {{ t('filter.resetFilters', { count: activeFiltersCount }) }}
      </button>
    </div>
  </div>
</template>
