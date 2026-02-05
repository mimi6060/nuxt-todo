<script setup lang="ts">
/**
 * Composant TodoItem - Affiche un todo individuel avec actions
 * Utilise le composable useConfirmModal pour la suppression
 *
 * Code splitting: ConfirmModal est chargé de manière asynchrone (lazy loading)
 * car il n'est affiché que lorsque l'utilisateur veut supprimer une tâche
 */

import type { Todo } from '~/types/todo'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PRIORITY_BADGE_COLORS } from '~/constants/priorities'
import { getIconComponent } from '~/constants/icons'

interface Props {
  todo: Todo
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  toggle: [id: string]
  edit: [todo: Todo]
  delete: [id: string]
  view: [todo: Todo]
}>()

// Lazy loading du modal de confirmation - chargé uniquement quand nécessaire
const LazyConfirmModal = defineAsyncComponent({
  loader: () => import('~/components/ui/ConfirmModal.vue'),
  delay: 0, // Pas de délai pour le modal (interaction utilisateur)
  timeout: 10000,
})

// Modal de confirmation
const { isOpen: confirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirmModal()

// Formatage de la deadline
const deadlineFormatted = computed(() => {
  if (!props.todo.deadline) return null
  return format(new Date(props.todo.deadline), 'dd MMM yyyy HH:mm', { locale: fr })
})

// Est en retard
const isOverdue = computed(() => {
  if (!props.todo.deadline || props.todo.completed) return false
  return isPast(new Date(props.todo.deadline))
})

// Confirmation avant suppression
async function handleDelete() {
  const confirmed = await confirm({
    title: t('confirm.title'),
    message: t('confirm.deleteTodo', { title: props.todo.title }),
    confirmText: t('confirm.deleteAction'),
    cancelText: t('confirm.cancelAction'),
    variant: 'danger',
  })

  if (confirmed) {
    emit('delete', props.todo.id)
  }
}
</script>

<template>
  <div
    class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    :class="{ 'opacity-60': todo.completed }"
  >
    <div class="flex items-start gap-3">
      <!-- Checkbox -->
      <input
        type="checkbox"
        :checked="todo.completed"
        :aria-label="todo.completed ? t('todo.markIncomplete', { title: todo.title }) : t('todo.markComplete', { title: todo.title })"
        @change="emit('toggle', todo.id)"
        class="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
      />

      <!-- Contenu principal (cliquable pour voir les détails) -->
      <div class="flex-1 min-w-0">
        <!-- Zone cliquable pour afficher les détails -->
        <div
          class="cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
          @click="emit('view', todo)"
        >
          <!-- Titre et priorité -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <h3
              class="text-lg font-medium text-gray-900"
              :class="{ 'line-through text-gray-500': todo.completed }"
            >
              {{ todo.title }}
            </h3>
            <span
              :class="PRIORITY_BADGE_COLORS[todo.priority]"
              class="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
            >
              {{ t(`priority.${todo.priority}`) }}
            </span>
          </div>

          <!-- Description -->
          <p
            v-if="todo.description"
            class="text-sm text-gray-600 mb-2"
            :class="{ 'line-through': todo.completed }"
          >
            {{ todo.description }}
          </p>

          <!-- Métadonnées -->
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
            <!-- Catégories -->
            <div v-if="todo.categories?.length" class="flex items-center gap-2 flex-wrap">
              <div
                v-for="category in todo.categories"
                :key="category.id"
                class="flex items-center gap-1"
              >
                <component
                  v-if="category.icon && getIconComponent(category.icon)"
                  :is="getIconComponent(category.icon)"
                  class="w-4 h-4"
                  aria-hidden="true"
                />
                <span>{{ category.name }}</span>
              </div>
            </div>

            <!-- Deadline -->
            <div
              v-if="deadlineFormatted"
              class="flex items-center gap-1"
              :class="{ 'text-red-600 font-medium': isOverdue }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{{ deadlineFormatted }}</span>
              <span v-if="isOverdue" class="text-xs font-bold">({{ t('todo.overdue') }})</span>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="todo.tags.length" class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="tag in todo.tags"
              :key="tag.id"
              class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
            >
              #{{ tag.name }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            @click="emit('edit', todo)"
            class="action-link-primary"
            :aria-label="`${t('common.edit')} ${todo.title}`"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {{ t('common.edit') }}
          </button>

          <button
            @click="handleDelete"
            class="action-link-danger"
            :aria-label="`${t('common.delete')} ${todo.title}`"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation (lazy loaded) -->
    <LazyConfirmModal
      v-if="confirmOpen"
      :open="confirmOpen"
      v-bind="confirmOptions"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>
