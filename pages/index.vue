<script setup lang="ts">
/**
 * Page d'accueil de l'application Todo
 * Orchestrateur principal utilisant les sous-composants
 * Protégée par authentification
 *
 * Filtrage et pagination côté SERVEUR
 *
 * Code splitting: TodoForm est chargé de manière asynchrone (lazy loading)
 * car il n'est affiché que lorsque l'utilisateur crée/édite une tâche
 *
 * Virtual scrolling: Utilise VirtualTodoList pour les grandes listes (> 20 items)
 * afin d'améliorer les performances en ne rendant que les éléments visibles
 */

definePageMeta({
  middleware: 'auth'
})

import type { Todo, CreateTodoDTO, Category, Tag } from '~/types/todo'

// Lazy loading du formulaire Todo - chargé uniquement quand nécessaire
const LazyTodoForm = defineAsyncComponent({
  loader: () => import('~/components/todo/TodoForm.vue'),
  // Délai avant d'afficher le loading (évite le flash pour les chargements rapides)
  delay: 200,
  // Timeout pour le chargement (10 secondes)
  timeout: 10000,
})

// Seuil pour activer le virtual scrolling
const VIRTUAL_SCROLL_THRESHOLD = 20

const { t } = useI18n()

// Store et composables
const todoStore = useTodoStore()
const { categories, fetchCategories, setCategories, createCategory, updateCategory, deleteCategory } = useCategories()
const { tags, fetchTags } = useTags()
const { getAuthHeaders, isAuthError, handleAuthError } = useAuth()

// Filtres côté serveur (connecté au store)
const filters = useFilters({
  onFiltersChange: async (params) => {
    await todoStore.fetchTodos(params)
  },
  autoFetch: false // On gère manuellement le premier fetch
})

// Etat du formulaire Todo
const showForm = ref(false)
const editingTodo = ref<Todo | undefined>(undefined)

// Etat du formulaire Categorie
const showCategoryForm = ref(false)
const editingCategory = ref<Category | undefined>(undefined)

// Etat du formulaire Tag
const showTagForm = ref(false)
const editingTag = ref<Tag | undefined>(undefined)

// Development mode check
const isDev = import.meta.dev

// Utiliser le virtual scrolling pour les grandes listes (performance)
const useVirtualScrolling = computed(() => todoStore.todos.length > VIRTUAL_SCROLL_THRESHOLD)

// Charger les donnees côté client uniquement (le token JWT n'est pas disponible en SSR)
onMounted(async () => {
  try {
    // Charger les todos
    const todosResponse = await $fetch<any>('/api/todos', {
      headers: getAuthHeaders()
    })
    if (todosResponse.data?.data) {
      todoStore.setTodos(todosResponse.data.data)
    }
    if (todosResponse.data?.meta) {
      todoStore.pagination = todosResponse.data.meta
    }

    // Charger les catégories
    const categoriesResponse = await $fetch<any>('/api/categories', {
      headers: getAuthHeaders()
    })
    if (categoriesResponse.data) {
      setCategories(categoriesResponse.data)
    }

    // Charger les tags
    await fetchTags()
  } catch (error: any) {
    if (isAuthError(error)) {
      handleAuthError()
      return
    }
    console.error('Error loading initial data:', error)
  }
})

// Actions sur les todos
async function handleToggleTodo(id: string) {
  await todoStore.toggleTodo(id)
}

async function handleEditTodo(todo: Todo) {
  editingTodo.value = todo
  showForm.value = true
}

async function handleDeleteTodo(id: string) {
  await todoStore.deleteTodo(id)
}

// Gestion du formulaire Todo
function openCreateForm() {
  editingTodo.value = undefined
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTodo.value = undefined
}

async function handleSubmitForm(data: CreateTodoDTO) {
  if (editingTodo.value) {
    await todoStore.updateTodo(editingTodo.value.id, data)
  } else {
    await todoStore.createTodo(data)
  }
  closeForm()
}

// Gestion du formulaire categorie
function openCategoryForm() {
  editingCategory.value = undefined
  showCategoryForm.value = true
}

function openEditCategory(category: Category) {
  editingCategory.value = category
  showCategoryForm.value = true
}

function closeCategoryForm() {
  showCategoryForm.value = false
  editingCategory.value = undefined
}

async function handleSubmitCategory(data: { name: string; color: string; icon: string }) {
  if (editingCategory.value) {
    const result = await updateCategory(editingCategory.value.id, data)
    if (result) {
      closeCategoryForm()
    }
  } else {
    const result = await createCategory(data)
    if (result) {
      closeCategoryForm()
    }
  }
}

async function handleDeleteCategory(id: string) {
  const result = await deleteCategory(id)
  if (result) {
    closeCategoryForm()
    // Rafraîchir les todos avec les filtres actuels
    await todoStore.fetchTodos(filters.buildQueryParams())
  }
}

// Gestion du formulaire tag
function openTagForm() {
  editingTag.value = undefined
  showTagForm.value = true
}

function openEditTag(tag: Tag) {
  editingTag.value = tag
  showTagForm.value = true
}

function closeTagForm() {
  showTagForm.value = false
  editingTag.value = undefined
}

async function handleSubmitTag(data: { name: string; color: string | null }) {
  try {
    if (editingTag.value) {
      // Mettre à jour le tag existant
      await $fetch(`/api/tags/${editingTag.value.id}`, {
        method: 'PUT',
        body: data,
        headers: getAuthHeaders()
      })
    } else {
      // Créer un nouveau tag
      await $fetch('/api/tags', {
        method: 'POST',
        body: data,
        headers: getAuthHeaders()
      })
    }
    await fetchTags()
    closeTagForm()
  } catch (error: any) {
    if (isAuthError(error)) {
      handleAuthError()
      return
    }
    console.error('Error saving tag:', error)
  }
}

async function handleDeleteTag(id: string) {
  try {
    await $fetch(`/api/tags/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await fetchTags()
    closeTagForm()
  } catch (error: any) {
    if (isAuthError(error)) {
      handleAuthError()
      return
    }
    console.error('Error deleting tag:', error)
  }
}

// Pagination - conserver les filtres actuels
async function handlePageChange(page: number) {
  const params = filters.buildQueryParams()
  params.page = page.toString()
  await todoStore.fetchTodos(params)
}

// Reset des filtres
async function handleResetFilters() {
  await filters.resetFilters()
}
</script>

<template>
  <section class="index-page min-h-screen bg-gray-50">
    <!-- Header -->
    <TodoListHeader @new-todo="openCreateForm" />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar gauche - Statistiques, categories et tags -->
        <aside class="lg:col-span-1 space-y-6">
          <CategorySidebar
            :stats="todoStore.stats"
            :categories="categories"
            :show-form="showCategoryForm"
            :editing-category="editingCategory"
            @edit-category="openEditCategory"
            @new-category="openCategoryForm"
            @submit-category="handleSubmitCategory"
            @delete-category="handleDeleteCategory"
            @cancel-form="closeCategoryForm"
          />

          <!-- Section Tags -->
          <TagSidebar
            :tags="tags"
            :show-form="showTagForm"
            :editing-tag="editingTag"
            @edit-tag="openEditTag"
            @new-tag="openTagForm"
            @submit-tag="handleSubmitTag"
            @delete-tag="handleDeleteTag"
            @cancel-form="closeTagForm"
          />
        </aside>

        <!-- Contenu principal -->
        <div class="lg:col-span-3 space-y-6">
          <!-- Filtres -->
          <TodoFilters
            v-model:search-query="filters.searchQuery.value"
            v-model:status-filter="filters.statusFilter.value"
            v-model:category-filter="filters.categoryFilter.value"
            v-model:priority-filter="filters.priorityFilter.value"
            v-model:sort-by="filters.sortBy.value"
            v-model:sort-order="filters.sortOrder.value"
            v-model:show-overdue-only="filters.showOverdueOnly.value"
            :active-filters-count="filters.activeFiltersCount.value"
            @reset="handleResetFilters"
          />

          <!-- Formulaire de creation/edition (lazy loaded - conditionnel) -->
          <Transition
            name="slide-fade"
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-4"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-4"
          >
            <Suspense v-if="showForm">
              <LazyTodoForm
                :todo="editingTodo"
                @submit="handleSubmitForm"
                @cancel="closeForm"
              />
              <template #fallback>
                <div class="card animate-pulse">
                  <div class="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div class="space-y-4">
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-24 bg-gray-200 rounded"></div>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="h-10 bg-gray-200 rounded"></div>
                      <div class="h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </template>
            </Suspense>
          </Transition>

          <!-- Liste des todos -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-800">
                {{ t('todo.myTodos') }}
                <span class="text-sm font-normal text-gray-500 ml-2">
                  ({{ t('todo.results', { count: todoStore.totalTodos }, todoStore.totalTodos) }})
                </span>
              </h2>
              <!-- Indicateur de filtrage -->
              <span v-if="filters.isFiltering.value" class="text-sm text-gray-500">
                {{ t('common.loading') }}
              </span>
            </div>

            <!-- Etat de chargement -->
            <div v-if="todoStore.loading && !filters.isFiltering.value" class="text-center py-12">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p class="mt-4 text-gray-600">{{ t('common.loading') }}</p>
            </div>

            <!-- Etat d'erreur -->
            <div v-else-if="todoStore.error" class="text-center py-12">
              <p class="text-red-600">{{ todoStore.error }}</p>
              <button
                @click="todoStore.fetchTodos(filters.buildQueryParams())"
                class="mt-4 btn-primary"
              >
                {{ t('common.retry') }}
              </button>
            </div>

            <!-- Liste vide -->
            <TodoListEmpty
              v-else-if="todoStore.todos.length === 0"
              :has-filters="filters.activeFiltersCount.value > 0"
            />

            <!-- Liste des todos avec virtual scrolling (grandes listes > 20 items) -->
            <TodoVirtualTodoList
              v-else-if="useVirtualScrolling"
              :todos="todoStore.todos"
              :container-height="Math.min(600, todoStore.todos.length * 120)"
              @toggle="handleToggleTodo"
              @edit="handleEditTodo"
              @delete="handleDeleteTodo"
            />

            <!-- Liste des todos avec animations (petites listes <= 20 items) -->
            <TransitionGroup
              v-else
              name="list"
              tag="div"
              class="space-y-3"
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 translate-x-4"
              enter-to-class="opacity-100 translate-x-0"
              leave-active-class="transition-all duration-200 ease-in absolute"
              leave-from-class="opacity-100 translate-x-0"
              leave-to-class="opacity-0 -translate-x-4"
            >
              <TodoItem
                v-for="todo in todoStore.todos"
                :key="todo.id"
                :todo="todo"
                @toggle="handleToggleTodo"
                @edit="handleEditTodo"
                @delete="handleDeleteTodo"
              />
            </TransitionGroup>

            <!-- Pagination -->
            <UiPagination
              v-if="todoStore.pagination && todoStore.totalPages > 1"
              :current-page="todoStore.currentPage"
              :total-pages="todoStore.totalPages"
              :total-items="todoStore.totalTodos"
              :items-per-page="todoStore.pagination.limit"
              :loading="todoStore.loading"
              @page-change="handlePageChange"
            />
          </div>

          <!-- Debug Info (development only) -->
          <div v-if="isDev" class="bg-gray-100 rounded-lg p-4 text-sm">
            <h3 class="font-bold text-gray-700 mb-2">Debug Info</h3>
            <p class="text-gray-600">Categories loaded: {{ categories.length }}</p>
            <p class="text-gray-600">Todos loaded: {{ todoStore.todos.length }}</p>
            <p class="text-gray-600">Total todos (server): {{ todoStore.totalTodos }}</p>
            <p class="text-gray-600">Current page: {{ todoStore.currentPage }} / {{ todoStore.totalPages }}</p>
            <p class="text-gray-600">Active filters: {{ filters.activeFiltersCount.value }}</p>
            <p class="text-gray-600">Is filtering: {{ filters.isFiltering.value }}</p>
            <p class="text-gray-600">Virtual scroll: {{ useVirtualScrolling ? 'Active (>' + VIRTUAL_SCROLL_THRESHOLD + ' items)' : 'Inactive' }}</p>
            <p class="text-gray-600">Store error: {{ todoStore.error || 'None' }}</p>
          </div>
        </div>
      </div>
    </main>
  </section>
</template>
