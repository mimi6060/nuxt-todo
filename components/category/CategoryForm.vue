<script setup lang="ts">
/**
 * Composant CategoryForm - Formulaire pour créer/éditer une catégorie
 * Utilise les composants UI réutilisables et le composable useConfirmModal
 * Utilise useFormValidation pour la validation des champs
 *
 * Code splitting: ConfirmModal est chargé de manière asynchrone (lazy loading)
 * car il n'est affiché que lorsque l'utilisateur veut supprimer une catégorie
 */

import type { Category } from '~/types/todo'
import { AVAILABLE_ICONS, DEFAULT_ICON, getIconEmoji } from '~/constants/icons'
import { AVAILABLE_COLORS, DEFAULT_COLOR } from '~/constants/colors'
import { useFormValidation, createValidationRules } from '~/composables/useFormValidation'

interface Props {
  category?: Category // Si fourni, mode édition
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  submit: [data: { name: string; color: string; icon: string }]
  delete: [id: string]
  cancel: []
}>()

// Lazy loading du modal de confirmation - chargé uniquement quand nécessaire
const LazyConfirmModal = defineAsyncComponent({
  loader: () => import('~/components/ui/ConfirmModal.vue'),
  delay: 0,
  timeout: 10000,
})

// Modal de confirmation
const { isOpen: confirmOpen, options: confirmOptions, confirm, handleConfirm, handleCancel } = useConfirmModal()

// Form state
const form = reactive({
  name: '',
  color: DEFAULT_COLOR.value,
  icon: DEFAULT_ICON.value,
})

// Mode édition
const isEditing = computed(() => !!props.category)

// Mettre à jour le formulaire quand la catégorie change
watch(() => props.category, (newCategory) => {
  if (newCategory) {
    form.name = newCategory.name || ''
    form.color = newCategory.color || DEFAULT_COLOR.value
    form.icon = newCategory.icon || DEFAULT_ICON.value
  } else {
    form.name = ''
    form.color = DEFAULT_COLOR.value
    form.icon = DEFAULT_ICON.value
  }
}, { immediate: true })

// Validation avec useFormValidation
const rules = createValidationRules(t)
const { errors, validate, clearFieldError } = useFormValidation<typeof form>({
  name: [
    rules.required(t('category.name')),
  ],
  color: [
    rules.required(t('category.color')),
  ],
})

function handleSubmit() {
  if (!validate(form)) return
  emit('submit', { ...form, name: form.name.trim() })
}

// Mapping pour afficher l'emoji sélectionné
const selectedIconEmoji = computed(() => getIconEmoji(form.icon))

// Supprimer la catégorie avec modal de confirmation
async function handleDelete() {
  if (!props.category) return

  // Récupérer le nombre de todos associés
  let todosCount = 0
  try {
    const { data } = await $fetch<{ success: boolean; data: { todosCount: number } }>(
      `/api/categories/${props.category.id}/delete-info`
    )
    if (data) {
      todosCount = data.todosCount
    }
  } catch {
    // En cas d'erreur, on continue avec count = 0
  }

  // Construire le message de confirmation
  const message = todosCount > 0
    ? t('confirm.deleteCategoryWithCount', { name: props.category.name, count: todosCount })
    : t('confirm.deleteCategory', { name: props.category.name })

  const confirmed = await confirm({
    title: t('confirm.title'),
    message,
    confirmText: t('confirm.deleteAction'),
    cancelText: t('confirm.cancelAction'),
    variant: 'danger',
  })

  if (confirmed) {
    emit('delete', props.category.id)
  }
}
</script>

<template>
  <div class="card">
    <h2 class="text-xl font-bold text-gray-800 mb-6">
      {{ isEditing ? t('category.edit') : t('category.new') }}
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Nom -->
      <div>
        <label for="name" class="form-label">
          {{ t('category.name') }} *
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          class="form-input"
          :class="{ 'border-red-500': errors.name }"
          :placeholder="t('category.namePlaceholder')"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? 'name-error' : undefined"
          required
          @input="clearFieldError('name')"
        />
        <p v-if="errors.name" id="name-error" class="form-error">{{ errors.name }}</p>
      </div>

      <!-- Icône -->
      <div>
        <label class="form-label">
          {{ t('category.icon') }}
        </label>
        <IconPicker v-model="form.icon" />
      </div>

      <!-- Couleur -->
      <div>
        <label id="color-label" class="form-label">
          {{ t('category.color') }} *
        </label>
        <ColorPicker
          v-model="form.color"
          :aria-labelledby="'color-label'"
          :aria-describedby="errors.color ? 'color-error' : undefined"
          @update:model-value="clearFieldError('color')"
        />
        <p v-if="errors.color" id="color-error" class="form-error">{{ errors.color }}</p>
      </div>

      <!-- Aperçu -->
      <div class="pt-4 border-t">
        <label class="form-label">
          {{ t('category.preview') }}
        </label>
        <div
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
          :style="{ backgroundColor: form.color }"
        >
          <span class="text-lg" aria-hidden="true">{{ selectedIconEmoji }}</span>
          <span class="font-medium">{{ form.name || t('category.previewPlaceholder') }}</span>
        </div>
      </div>

      <!-- Boutons -->
      <div class="space-y-3 pt-4">
        <div class="flex gap-3">
          <button type="submit" class="flex-1 btn-primary">
            {{ isEditing ? t('common.save') : t('common.create') }}
          </button>
          <button type="button" @click="emit('cancel')" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
        </div>
        <button
          v-if="isEditing"
          type="button"
          @click="handleDelete"
          class="w-full btn-danger-outline"
        >
          {{ t('category.deleteWithTodos') }}
        </button>
      </div>
    </form>

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
