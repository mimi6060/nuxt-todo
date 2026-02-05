<script setup lang="ts">
/**
 * Composant TodoListEmpty - Etat vide de la liste des todos
 * Affiche un message different selon si des filtres sont actifs ou non
 */

interface Props {
  hasFilters: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div class="text-center py-12">
    <div class="text-6xl mb-4" aria-hidden="true">
      <slot name="icon">
        <span>&#x1F4DD;</span>
      </slot>
    </div>
    <p class="text-gray-600 text-lg mb-2">{{ t('todo.empty') }}</p>
    <p class="text-gray-500 text-sm">
      {{ hasFilters ? t('todo.emptyFilterHint') : t('todo.emptyHint') }}
    </p>
  </div>
</template>
