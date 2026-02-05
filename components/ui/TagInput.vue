<script setup lang="ts">
/**
 * Composant TagInput - Input de tags avec autocomplete
 * Implémente le pattern ARIA combobox pour l'accessibilité
 */

interface Props {
  modelValue: string[]
  suggestions?: string[]
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  suggestions: () => [],
})

const { t } = useI18n()

// Placeholder avec fallback i18n
const computedPlaceholder = computed(() => props.placeholder || t('todo.tagsPlaceholder'))

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// State local
const inputValue = ref('')
const inputFocused = ref(false)
const highlightedIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const listboxId = useId()

// Tags filtrés pour les suggestions
const filteredSuggestions = computed(() => {
  const currentTags = props.modelValue
  const available = props.suggestions.filter(tag => !currentTags.includes(tag))

  if (!inputValue.value) {
    return available
  }

  const searchLower = inputValue.value.toLowerCase()
  return available.filter(tag => tag.toLowerCase().includes(searchLower))
})

// Afficher la liste de suggestions
const showSuggestions = computed(() => {
  return inputFocused.value && filteredSuggestions.value.length > 0
})

// Le tag saisi n'existe pas encore
const isNewTag = computed(() => {
  if (!inputValue.value.trim()) return false
  const trimmed = inputValue.value.trim().toLowerCase()
  return !props.suggestions.some(t => t.toLowerCase() === trimmed)
})

// Ajouter un tag
function addTag(tag?: string) {
  const tagToAdd = (tag || inputValue.value).trim()
  if (tagToAdd && !props.modelValue.includes(tagToAdd)) {
    emit('update:modelValue', [...props.modelValue, tagToAdd])
  }
  inputValue.value = ''
  highlightedIndex.value = -1
}

// Retirer un tag
function removeTag(tag: string) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}

// Gestion du clavier
function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (showSuggestions.value) {
        highlightedIndex.value = Math.min(
          highlightedIndex.value + 1,
          filteredSuggestions.value.length - 1
        )
      }
      break

    case 'ArrowUp':
      event.preventDefault()
      if (showSuggestions.value) {
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      }
      break

    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0 && showSuggestions.value) {
        addTag(filteredSuggestions.value[highlightedIndex.value])
      } else if (inputValue.value.trim()) {
        addTag()
      }
      break

    case 'Escape':
      event.preventDefault()
      inputFocused.value = false
      highlightedIndex.value = -1
      break

    case 'Backspace':
      if (!inputValue.value && props.modelValue.length > 0) {
        removeTag(props.modelValue[props.modelValue.length - 1])
      }
      break
  }
}

function handleFocus() {
  inputFocused.value = true
}

function handleBlur() {
  // Délai pour permettre le clic sur une suggestion
  setTimeout(() => {
    inputFocused.value = false
    highlightedIndex.value = -1
  }, 200)
}

function selectSuggestion(tag: string) {
  addTag(tag)
  inputRef.value?.focus()
}
</script>

<template>
  <div class="space-y-2">
    <!-- Input avec autocomplete -->
    <div class="relative">
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <input
            ref="inputRef"
            v-model="inputValue"
            type="text"
            class="form-input"
            :placeholder="computedPlaceholder"
            role="combobox"
            :aria-expanded="showSuggestions"
            aria-autocomplete="list"
            :aria-controls="listboxId"
            :aria-activedescendant="highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined"
            @keydown="handleKeydown"
            @focus="handleFocus"
            @blur="handleBlur"
          />

          <!-- Dropdown suggestions -->
          <div
            v-if="showSuggestions || (inputFocused && isNewTag)"
            :id="listboxId"
            role="listbox"
            class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <!-- Suggestions existantes -->
            <button
              v-for="(tag, index) in filteredSuggestions"
              :id="`${listboxId}-option-${index}`"
              :key="tag"
              type="button"
              role="option"
              :aria-selected="highlightedIndex === index"
              class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
              :class="highlightedIndex === index ? 'bg-blue-100' : 'hover:bg-blue-50'"
              @mousedown.prevent="selectSuggestion(tag)"
              @mouseenter="highlightedIndex = index"
            >
              <span class="text-gray-400" aria-hidden="true">#</span>
              <span>{{ tag }}</span>
            </button>

            <!-- Option pour créer un nouveau tag -->
            <div
              v-if="isNewTag"
              class="border-t"
            >
              <button
                type="button"
                role="option"
                class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-green-700 hover:bg-green-50 transition-colors"
                @mousedown.prevent="addTag()"
              >
                <span aria-hidden="true">+</span>
                <span>{{ t('todo.tagCreate', { name: inputValue.trim() }) }}</span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn-secondary"
          :disabled="!inputValue.trim()"
          @click="addTag()"
        >
          {{ t('common.add') }}
        </button>
      </div>
    </div>

    <!-- Tags sélectionnés -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-2">
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="tag-removable"
      >
        <span aria-hidden="true">#</span>{{ tag }}
        <button
          type="button"
          class="tag-remove-btn"
          :aria-label="t('todo.tagRemove', { tag })"
          @click="removeTag(tag)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </span>
    </div>

    <!-- Hint -->
    <p
      v-if="suggestions.length > 0 && modelValue.length === 0"
      class="form-hint"
    >
      {{ t('todo.tagsAvailable', { count: suggestions.length }) }}
    </p>
  </div>
</template>
