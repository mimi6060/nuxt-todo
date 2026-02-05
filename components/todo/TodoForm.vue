<script setup lang="ts">
/**
 * Composant TodoForm - Formulaire pour créer/éditer des todos
 * Utilise des dropdowns compacts pour catégories et tags
 * Utilise useFormValidation pour la validation des champs
 */

import type { CreateTodoDTO, Todo, Priority } from '~/types/todo'
import { getIconEmoji } from '~/constants/icons'
import { PRIORITY_OPTIONS } from '~/constants/priorities'
import { useFormValidation, createValidationRules } from '~/composables/useFormValidation'

interface Props {
  todo?: Todo // Si fourni, mode édition, sinon mode creation
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  submit: [data: CreateTodoDTO]
  cancel: []
}>()

// Charger les catégories
const { categories, fetchCategories } = useCategories()

// Charger les tags existants
const { tags, fetchTags } = useTags()

// Form state - convert Tag[] to string[] for the form
const form = reactive({
  title: props.todo?.title || '',
  description: props.todo?.description || '',
  priority: (props.todo?.priority || 'MEDIUM') as Priority,
  categoryIds: (props.todo?.categories?.map(c => c.id) || []) as string[],
  tagIds: (props.todo?.tags?.map(t => t.id) || []) as string[],
  deadline: props.todo?.deadline ? new Date(props.todo.deadline).toISOString().slice(0, 16) : '',
})

// État des dropdowns
const categoryDropdownOpen = ref(false)
const tagDropdownOpen = ref(false)

// Libellé du sélecteur de catégories
const categorySelectLabel = computed(() => {
  if (form.categoryIds.length === 0) return t('todo.categorySelect')
  if (form.categoryIds.length === 1) {
    const cat = categories.value.find(c => c.id === form.categoryIds[0])
    return cat ? `${getIconEmoji(cat.icon)} ${cat.name}` : t('todo.categorySelect')
  }
  return t('todo.categoriesSelected', { count: form.categoryIds.length })
})

// Libellé du sélecteur de tags
const tagSelectLabel = computed(() => {
  if (form.tagIds.length === 0) return t('todo.tagSelect')
  if (form.tagIds.length === 1) {
    const tag = tags.value.find(t => t.id === form.tagIds[0])
    return tag ? `#${tag.name}` : t('todo.tagSelect')
  }
  return t('tag.tagsSelected', { count: form.tagIds.length })
})

// Fermer les dropdowns en cliquant ailleurs
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.category-dropdown')) {
    categoryDropdownOpen.value = false
  }
  if (!target.closest('.tag-dropdown')) {
    tagDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchCategories()
  fetchTags()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Validation avec useFormValidation
const rules = createValidationRules(t)
const { errors, validate, clearFieldError } = useFormValidation<typeof form>({
  title: [
    rules.required(t('todo.title')),
    rules.maxLength(t('todo.title'), 200),
  ],
  description: [
    rules.maxLength(t('todo.description'), 2000),
  ],
  categoryIds: [
    (value: string[]) => value.length > 0 || t('validation.fieldRequired', { field: t('todo.categories') }),
  ],
})

function handleSubmit() {
  if (!validate(form)) return

  // Convertir tagIds en noms de tags pour l'API
  const tagNames = form.tagIds
    .map(id => tags.value.find(t => t.id === id)?.name)
    .filter((name): name is string => !!name)

  const data: CreateTodoDTO = {
    title: form.title,
    description: form.description || undefined,
    priority: form.priority,
    categoryIds: form.categoryIds,
    tags: tagNames,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
  }

  emit('submit', data)
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="card">
    <h2 class="text-xl font-bold text-gray-800 mb-6">
      {{ todo ? t('todo.edit') : t('todo.new') }}
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Titre -->
      <div>
        <label for="title" class="form-label">
          {{ t('todo.title') }} *
        </label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          class="form-input"
          :class="{ 'border-red-500': errors.title }"
          :placeholder="t('todo.titlePlaceholder')"
          :aria-invalid="!!errors.title"
          :aria-describedby="errors.title ? 'title-error' : undefined"
          maxlength="200"
          required
          @input="clearFieldError('title')"
        />
        <p v-if="errors.title" id="title-error" class="form-error">{{ errors.title }}</p>
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="form-label">
          {{ t('todo.description') }}
        </label>
        <textarea
          id="description"
          v-model="form.description"
          rows="3"
          class="form-input"
          :class="{ 'border-red-500': errors.description }"
          :placeholder="t('todo.descriptionPlaceholder')"
          :aria-invalid="!!errors.description"
          :aria-describedby="errors.description ? 'description-error' : undefined"
          maxlength="2000"
          @input="clearFieldError('description')"
        />
        <p v-if="errors.description" id="description-error" class="form-error">{{ errors.description }}</p>
      </div>

      <!-- Priorité et Catégorie (côte à côte) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Priorité -->
        <div>
          <label for="priority" class="form-label">
            {{ t('todo.priority') }}
          </label>
          <select
            id="priority"
            v-model="form.priority"
            class="form-select"
          >
            <option v-for="p in PRIORITY_OPTIONS" :key="p.value" :value="p.value">
              {{ t(p.labelKey) }}
            </option>
          </select>
        </div>

        <!-- Catégories (multiple) - Dropdown compact -->
        <div class="category-dropdown relative">
          <label class="form-label">
            {{ t('todo.categories') }} *
          </label>
          <!-- Bouton dropdown -->
          <button
            type="button"
            @click="categoryDropdownOpen = !categoryDropdownOpen"
            class="form-select w-full text-left flex items-center justify-between"
            :class="{ 'border-red-500': errors.categoryIds }"
          >
            <span :class="{ 'text-gray-400': form.categoryIds.length === 0 }">
              {{ categorySelectLabel }}
            </span>
            <svg
              class="w-5 h-5 text-gray-400 transition-transform"
              :class="{ 'rotate-180': categoryDropdownOpen }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <!-- Liste déroulante -->
          <div
            v-show="categoryDropdownOpen"
            class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            <label
              v-for="cat in categories"
              :key="cat.id"
              class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                :value="cat.id"
                v-model="form.categoryIds"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                @change="clearFieldError('categoryIds')"
              />
              <span class="flex items-center gap-1">
                {{ getIconEmoji(cat.icon) }} {{ cat.name }}
              </span>
            </label>
          </div>
          <p v-if="errors.categoryIds" id="category-error" class="form-error">{{ errors.categoryIds }}</p>
        </div>
      </div>

      <!-- Deadline -->
      <div>
        <label for="deadline" class="form-label">
          {{ t('todo.deadline') }}
        </label>
        <input
          id="deadline"
          v-model="form.deadline"
          type="datetime-local"
          class="form-input"
        />
      </div>

      <!-- Tags - Dropdown compact -->
      <div class="tag-dropdown relative">
        <label class="form-label">
          {{ t('todo.tags') }}
        </label>
        <!-- Bouton dropdown -->
        <button
          type="button"
          @click="tagDropdownOpen = !tagDropdownOpen"
          class="form-select w-full text-left flex items-center justify-between"
        >
          <span :class="{ 'text-gray-400': form.tagIds.length === 0 }">
            {{ tagSelectLabel }}
          </span>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': tagDropdownOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <!-- Liste déroulante -->
        <div
          v-show="tagDropdownOpen"
          class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <div v-if="tags.length === 0" class="px-3 py-2 text-sm text-gray-500">
            {{ t('tag.empty') }}
          </div>
          <label
            v-for="tag in tags"
            :key="tag.id"
            class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              :value="tag.id"
              v-model="form.tagIds"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span
              class="px-2 py-0.5 rounded-full text-xs font-medium"
              :style="{ backgroundColor: (tag.color || '#6B7280') + '20', color: tag.color || '#6B7280' }"
            >
              #{{ tag.name }}
            </span>
          </label>
        </div>
      </div>

      <!-- Boutons -->
      <div class="flex gap-3 pt-4">
        <button type="submit" class="flex-1 btn-primary">
          {{ todo ? t('common.update') : t('common.create') }}
        </button>
        <button type="button" @click="handleCancel" class="btn-secondary">
          {{ t('common.cancel') }}
        </button>
      </div>
    </form>
  </div>
</template>
