<script setup lang="ts">
/**
 * Composant TagForm - Formulaire pour créer/éditer un tag
 */

import type { Tag } from '~/types/todo'
import { AVAILABLE_COLORS, DEFAULT_COLOR } from '~/constants/colors'
import { useFormValidation, createValidationRules } from '~/composables/useFormValidation'

interface Props {
  tag?: Tag // Si fourni, mode édition
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  submit: [data: { name: string; color: string | null }]
  delete: [id: string]
  cancel: []
}>()

// Lazy loading du modal de confirmation
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
})

// Mode édition
const isEditing = computed(() => !!props.tag)

// Mettre à jour le formulaire quand le tag change
watch(() => props.tag, (newTag) => {
  if (newTag) {
    form.name = newTag.name || ''
    form.color = newTag.color || DEFAULT_COLOR.value
  } else {
    form.name = ''
    form.color = DEFAULT_COLOR.value
  }
}, { immediate: true })

// Validation
const rules = createValidationRules(t)
const { errors, validate, clearFieldError } = useFormValidation<typeof form>({
  name: [
    rules.required(t('tag.name')),
    rules.maxLength(t('tag.name'), 50),
  ],
})

function handleSubmit() {
  if (!validate(form)) return
  emit('submit', { name: form.name.trim().toLowerCase(), color: form.color })
}

// Supprimer le tag
async function handleDelete() {
  if (!props.tag) return

  const confirmed = await confirm({
    title: t('confirm.title'),
    message: t('confirm.deleteTag', { name: props.tag.name }),
    confirmText: t('confirm.deleteAction'),
    cancelText: t('confirm.cancelAction'),
    variant: 'danger',
  })

  if (confirmed) {
    emit('delete', props.tag.id)
  }
}
</script>

<template>
  <div class="card">
    <h2 class="text-xl font-bold text-gray-800 mb-6">
      {{ isEditing ? t('tag.edit') : t('tag.new') }}
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Nom -->
      <div>
        <label for="tag-name" class="form-label">
          {{ t('tag.name') }} *
        </label>
        <input
          id="tag-name"
          v-model="form.name"
          type="text"
          class="form-input"
          :class="{ 'border-red-500': errors.name }"
          :placeholder="t('tag.namePlaceholder')"
          :aria-invalid="!!errors.name"
          maxlength="50"
          required
          @input="clearFieldError('name')"
        />
        <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
      </div>

      <!-- Couleur (optionnelle) -->
      <div>
        <label class="form-label">
          {{ t('tag.color') }}
        </label>
        <ColorPicker v-model="form.color" />
      </div>

      <!-- Aperçu -->
      <div class="pt-4 border-t">
        <label class="form-label">
          {{ t('category.preview') }}
        </label>
        <span
          class="inline-block px-3 py-1 rounded-full text-sm font-medium"
          :style="{ backgroundColor: form.color + '20', color: form.color }"
        >
          #{{ form.name || 'tag' }}
        </span>
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
          {{ t('common.delete') }}
        </button>
      </div>
    </form>

    <!-- Modal de confirmation -->
    <LazyConfirmModal
      v-if="confirmOpen"
      :open="confirmOpen"
      v-bind="confirmOptions"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>
