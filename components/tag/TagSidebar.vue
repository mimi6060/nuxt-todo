<script setup lang="ts">
/**
 * Composant TagSidebar - Sidebar des tags
 * Affiche les tags existants et le formulaire de creation/edition
 */

import type { Tag } from '~/types/todo'

interface Props {
  tags: Tag[]
  showForm: boolean
  editingTag?: Tag
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  editTag: [tag: Tag]
  newTag: []
  submitTag: [data: { name: string; color: string | null }]
  deleteTag: [id: string]
  cancelForm: []
}>()

// Lazy loading du formulaire Tag
const LazyTagForm = defineAsyncComponent({
  loader: () => import('~/components/tag/TagForm.vue'),
  delay: 200,
  timeout: 10000,
})
</script>

<template>
  <div class="space-y-4">
    <!-- Liste des tags -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">
        {{ t('tag.title') }}
      </h3>

      <div v-if="tags.length === 0" class="text-sm text-gray-500 py-2">
        {{ t('tag.empty') }}
      </div>

      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="tag in tags"
          :key="tag.id"
          @click="emit('editTag', tag)"
          class="px-3 py-1 rounded-full text-sm font-medium transition-all hover:scale-105 hover:shadow-sm"
          :style="{
            backgroundColor: (tag.color || '#6B7280') + '20',
            color: tag.color || '#6B7280'
          }"
        >
          #{{ tag.name }}
        </button>
      </div>
    </div>

    <!-- Bouton nouveau tag -->
    <button
      @click="emit('newTag')"
      class="w-full px-4 py-2 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
    >
      <span aria-hidden="true">+</span>
      <span>{{ t('tag.new') }}</span>
    </button>

    <!-- Formulaire tag (lazy loaded) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <Suspense v-if="showForm">
        <LazyTagForm
          :tag="editingTag"
          @submit="emit('submitTag', $event)"
          @delete="emit('deleteTag', $event)"
          @cancel="emit('cancelForm')"
        />
        <template #fallback>
          <div class="card animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div class="space-y-4">
              <div class="h-10 bg-gray-200 rounded"></div>
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
