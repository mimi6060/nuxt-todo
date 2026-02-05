<script setup lang="ts">
/**
 * VirtualTodoList - Liste de todos avec virtual scrolling
 * Utilise @tanstack/vue-virtual pour de meilleures performances avec de grandes listes
 *
 * Le virtual scrolling ne rend que les elements visibles dans le viewport,
 * ce qui ameliore significativement les performances pour les listes de > 20 items
 */

import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Todo } from '~/types/todo'

interface Props {
  todos: Todo[]
  // Hauteur estimee d'un item (sera mesuree dynamiquement)
  estimatedItemHeight?: number
  // Hauteur du conteneur
  containerHeight?: number
  // Nombre d'items a prerendre au-dessus/en-dessous du viewport
  overscan?: number
}

const props = withDefaults(defineProps<Props>(), {
  estimatedItemHeight: 160,
  containerHeight: 600,
  overscan: 3,
})

const emit = defineEmits<{
  toggle: [id: string]
  edit: [todo: Todo]
  delete: [id: string]
}>()

// Reference au conteneur scrollable
const parentRef = ref<HTMLElement | null>(null)

// Nombre d'items (reactif)
const itemCount = computed(() => props.todos.length)

// Configuration du virtualizer
const virtualizer = useVirtualizer(
  computed(() => ({
    count: itemCount.value,
    getScrollElement: () => parentRef.value,
    estimateSize: () => props.estimatedItemHeight,
    overscan: props.overscan,
  }))
)

// Items virtuels a rendre
const virtualItems = computed(() => virtualizer.value.getVirtualItems())

// Hauteur totale de la liste
const totalSize = computed(() => virtualizer.value.getTotalSize())

// Handlers des evenements
function handleToggle(id: string) {
  emit('toggle', id)
}

function handleEdit(todo: Todo) {
  emit('edit', todo)
}

function handleDelete(id: string) {
  emit('delete', id)
}

// Le virtualizer se met a jour automatiquement quand itemCount change
// grace a l'utilisation de computed() dans useVirtualizer
</script>

<template>
  <div
    ref="parentRef"
    class="virtual-list-container overflow-auto"
    :style="{ height: `${containerHeight}px` }"
  >
    <div
      class="virtual-list-content relative w-full"
      :style="{ height: `${totalSize}px` }"
    >
      <div
        v-for="virtualItem in virtualItems"
        :key="todos[virtualItem.index].id"
        class="absolute top-0 left-0 w-full"
        :style="{
          transform: `translateY(${virtualItem.start}px)`,
        }"
        :data-index="virtualItem.index"
      >
        <div class="pb-3">
          <TodoItem
            :todo="todos[virtualItem.index]"
            @toggle="handleToggle"
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list-container {
  /* Assure que le scroll fonctionne correctement */
  will-change: scroll-position;
}

.virtual-list-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>
