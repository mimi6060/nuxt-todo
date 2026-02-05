<script setup lang="ts">
/**
 * Composant CategorySidebar - Sidebar des categories avec statistiques
 * Affiche les stats, les categories et le formulaire de creation/edition
 *
 * Code splitting: CategoryForm est chargé de manière asynchrone (lazy loading)
 * car il n'est affiché que lorsque l'utilisateur crée/édite une catégorie
 */

import type { Category, TodoStats } from '~/types/todo'

interface Props {
  stats: TodoStats
  categories: Category[]
  showForm: boolean
  editingCategory?: Category
}

const props = defineProps<Props>()

const { t } = useI18n()

const emit = defineEmits<{
  editCategory: [category: Category]
  newCategory: []
  submitCategory: [data: { name: string; color: string; icon: string }]
  deleteCategory: [id: string]
  cancelForm: []
}>()

// Lazy loading du formulaire Category - chargé uniquement quand nécessaire
const LazyCategoryForm = defineAsyncComponent({
  loader: () => import('~/components/category/CategoryForm.vue'),
  delay: 200,
  timeout: 10000,
})
</script>

<template>
  <div class="space-y-4">
    <TodoStats
      :stats="stats"
      :categories="categories"
      @edit-category="emit('editCategory', $event)"
    />

    <!-- Bouton nouvelle categorie -->
    <button
      @click="emit('newCategory')"
      class="w-full px-4 py-2 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
    >
      <span aria-hidden="true">+</span>
      <span>{{ t('category.new') }}</span>
    </button>

    <!-- Formulaire categorie (lazy loaded) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <Suspense v-if="showForm">
        <LazyCategoryForm
          :category="editingCategory"
          @submit="emit('submitCategory', $event)"
          @delete="emit('deleteCategory', $event)"
          @cancel="emit('cancelForm')"
        />
        <template #fallback>
          <div class="card animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div class="space-y-4">
              <div class="h-10 bg-gray-200 rounded"></div>
              <div class="grid grid-cols-5 gap-2">
                <div v-for="i in 10" :key="i" class="h-12 bg-gray-200 rounded-lg"></div>
              </div>
              <div class="flex gap-2">
                <div v-for="i in 8" :key="i" class="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        </template>
      </Suspense>
    </Transition>
  </div>
</template>
