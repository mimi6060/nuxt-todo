<script setup lang="ts">
/**
 * Composant TodoListHeader - Header de la page principale
 * Affiche le titre de l'application et le bouton de creation
 */

const { t } = useI18n()

defineEmits<{
  newTodo: []
}>()
</script>

<template>
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            {{ t('app.title') }}
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            {{ t('app.subtitle') }}
          </p>
        </div>
        <button
          @click="$emit('newTodo')"
          class="btn-primary px-6 py-3 shadow-sm"
        >
          {{ t('todo.new') }}
        </button>
      </div>
    </div>
  </header>
</template>
