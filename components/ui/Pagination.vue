<script setup lang="ts">
/**
 * Composant Pagination - Navigation entre les pages de résultats
 */

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'page-change': [page: number]
}>()

const { t } = useI18n()

// Calcul des pages à afficher (max 5 pages visibles)
const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5

  let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(props.totalPages, start + maxVisible - 1)

  // Ajuster le début si on est proche de la fin
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

// Informations sur les items affichés
const itemsInfo = computed(() => {
  const start = (props.currentPage - 1) * props.itemsPerPage + 1
  const end = Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
  return { start, end }
})

function goToPage(page: number) {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage && !props.loading) {
    emit('page-change', page)
  }
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
    <!-- Info sur les résultats -->
    <div class="text-sm text-gray-600">
      {{ t('pagination.showing', { start: itemsInfo.start, end: itemsInfo.end, total: totalItems }) }}
    </div>

    <!-- Contrôles de pagination -->
    <nav class="flex items-center gap-1" aria-label="Pagination">
      <!-- Bouton Précédent -->
      <button
        :disabled="currentPage <= 1 || loading"
        class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="currentPage <= 1 || loading
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-700 hover:bg-gray-100'"
        @click="goToPage(currentPage - 1)"
      >
        <span class="sr-only">{{ t('pagination.previous') }}</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Première page si pas visible -->
      <template v-if="visiblePages[0] > 1">
        <button
          class="px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
          @click="goToPage(1)"
        >
          1
        </button>
        <span v-if="visiblePages[0] > 2" class="px-2 text-gray-400">...</span>
      </template>

      <!-- Pages visibles -->
      <button
        v-for="page in visiblePages"
        :key="page"
        :disabled="loading"
        class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="page === currentPage
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>

      <!-- Dernière page si pas visible -->
      <template v-if="visiblePages[visiblePages.length - 1] < totalPages">
        <span v-if="visiblePages[visiblePages.length - 1] < totalPages - 1" class="px-2 text-gray-400">...</span>
        <button
          class="px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
          @click="goToPage(totalPages)"
        >
          {{ totalPages }}
        </button>
      </template>

      <!-- Bouton Suivant -->
      <button
        :disabled="currentPage >= totalPages || loading"
        class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="currentPage >= totalPages || loading
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-700 hover:bg-gray-100'"
        @click="goToPage(currentPage + 1)"
      >
        <span class="sr-only">{{ t('pagination.next') }}</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  </div>
</template>
