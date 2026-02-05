<script setup lang="ts">
/**
 * Modal d'affichage des détails d'un todo
 * Affiche toutes les informations du todo en lecture seule
 */

import type { Todo } from '~/types/todo'
import { format, isPast, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PRIORITY_BADGE_COLORS } from '~/constants/priorities'
import { getIconComponent } from '~/constants/icons'

interface Props {
  open: boolean
  todo: Todo | null
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  close: []
  edit: [todo: Todo]
}>()

// Formatage de la deadline
const deadlineFormatted = computed(() => {
  if (!props.todo?.deadline) return null
  return format(new Date(props.todo.deadline), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })
})

// Temps restant avant la deadline
const deadlineRelative = computed(() => {
  if (!props.todo?.deadline) return null
  const deadline = new Date(props.todo.deadline)
  return formatDistanceToNow(deadline, { locale: fr, addSuffix: true })
})

// Est en retard
const isOverdue = computed(() => {
  if (!props.todo?.deadline || props.todo.completed) return false
  return isPast(new Date(props.todo.deadline))
})

// Date de création formatée
const createdAtFormatted = computed(() => {
  if (!props.todo?.createdAt) return null
  return format(new Date(props.todo.createdAt), 'd MMMM yyyy à HH:mm', { locale: fr })
})

// Date de mise à jour formatée
const updatedAtFormatted = computed(() => {
  if (!props.todo?.updatedAt) return null
  return format(new Date(props.todo.updatedAt), 'd MMMM yyyy à HH:mm', { locale: fr })
})

function handleClose() {
  emit('close')
}

function handleEdit() {
  if (props.todo) {
    emit('edit', props.todo)
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && todo"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="handleClose"
      >
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open && todo"
            class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            <!-- Header -->
            <div class="flex items-start justify-between px-6 py-4 border-b bg-gray-50">
              <div class="flex-1 min-w-0 pr-4">
                <div class="flex items-center gap-3 mb-2">
                  <!-- Statut -->
                  <span
                    v-if="todo.completed"
                    class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
                  >
                    {{ t('filter.statusCompleted') }}
                  </span>
                  <span
                    v-else
                    class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
                  >
                    {{ t('filter.statusActive') }}
                  </span>

                  <!-- Priorité -->
                  <span
                    :class="PRIORITY_BADGE_COLORS[todo.priority]"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ t(`priority.${todo.priority}`) }}
                  </span>

                  <!-- En retard -->
                  <span
                    v-if="isOverdue"
                    class="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700"
                  >
                    {{ t('todo.overdue') }}
                  </span>
                </div>

                <h2
                  class="text-xl font-semibold text-gray-900"
                  :class="{ 'line-through text-gray-500': todo.completed }"
                >
                  {{ todo.title }}
                </h2>
              </div>

              <button
                @click="handleClose"
                class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
              <!-- Description -->
              <div v-if="todo.description">
                <h3 class="text-sm font-medium text-gray-500 mb-2">{{ t('todo.description') }}</h3>
                <p class="text-gray-900 whitespace-pre-wrap">{{ todo.description }}</p>
              </div>

              <!-- Catégories -->
              <div v-if="todo.categories?.length">
                <h3 class="text-sm font-medium text-gray-500 mb-2">{{ t('todo.categories') }}</h3>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="category in todo.categories"
                    :key="category.id"
                    class="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                  >
                    <component
                      v-if="category.icon && getIconComponent(category.icon)"
                      :is="getIconComponent(category.icon)"
                      class="w-5 h-5"
                      :style="{ color: category.color }"
                      aria-hidden="true"
                    />
                    <span class="font-medium">{{ category.name }}</span>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="todo.tags?.length">
                <h3 class="text-sm font-medium text-gray-500 mb-2">{{ t('todo.tags') }}</h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in todo.tags"
                    :key="tag.id"
                    class="px-3 py-1 rounded-full text-sm"
                    :style="tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : {}"
                    :class="!tag.color && 'bg-gray-100 text-gray-700'"
                  >
                    #{{ tag.name }}
                  </span>
                </div>
              </div>

              <!-- Deadline -->
              <div v-if="todo.deadline">
                <h3 class="text-sm font-medium text-gray-500 mb-2">{{ t('todo.deadline') }}</h3>
                <div
                  class="flex items-center gap-3 p-3 rounded-lg"
                  :class="isOverdue ? 'bg-red-50' : 'bg-gray-50'"
                >
                  <svg
                    class="w-5 h-5"
                    :class="isOverdue ? 'text-red-500' : 'text-gray-500'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <p
                      class="font-medium"
                      :class="isOverdue ? 'text-red-700' : 'text-gray-900'"
                    >
                      {{ deadlineFormatted }}
                    </p>
                    <p
                      class="text-sm"
                      :class="isOverdue ? 'text-red-600' : 'text-gray-500'"
                    >
                      {{ deadlineRelative }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Métadonnées -->
              <div class="border-t pt-4">
                <h3 class="text-sm font-medium text-gray-500 mb-3">{{ t('todo.info') }}</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-gray-500">{{ t('todo.createdAt') }}</span>
                    <p class="text-gray-900">{{ createdAtFormatted }}</p>
                  </div>
                  <div>
                    <span class="text-gray-500">{{ t('todo.updatedAt') }}</span>
                    <p class="text-gray-900">{{ updatedAtFormatted }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                @click="handleEdit"
                class="btn-primary flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                @click="handleClose"
                class="btn-secondary"
              >
                {{ t('common.close') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
