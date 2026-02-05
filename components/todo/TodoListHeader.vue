<script setup lang="ts">
/**
 * Composant TodoListHeader - Header de la page principale
 * Affiche le titre de l'application, le bouton de creation et le menu utilisateur
 */

const { t } = useI18n()
const { user, logout } = useAuth()
const router = useRouter()

const userMenuOpen = ref(false)
const profileModalOpen = ref(false)

defineEmits<{
  newTodo: []
}>()

function openProfileModal() {
  userMenuOpen.value = false
  profileModalOpen.value = true
}

// Fermer le menu en cliquant ailleurs
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.user-menu')) {
    userMenuOpen.value = false
  }
}

async function handleLogout() {
  await logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
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

        <div class="flex items-center gap-4">
          <!-- Bouton nouveau todo -->
          <button
            @click="$emit('newTodo')"
            class="btn-primary px-6 py-3 shadow-sm"
          >
            {{ t('todo.new') }}
          </button>

          <!-- Menu utilisateur -->
          <div class="user-menu relative">
            <button
              @click="userMenuOpen = !userMenuOpen"
              class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <!-- Avatar -->
              <div class="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {{ user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <!-- Nom/Email -->
              <div class="hidden sm:block text-left">
                <p class="text-sm font-medium text-gray-700">
                  {{ user?.name || t('auth.name') }}
                </p>
                <p class="text-xs text-gray-500 truncate max-w-32">
                  {{ user?.email }}
                </p>
              </div>
              <!-- Chevron -->
              <svg
                class="w-4 h-4 text-gray-500 transition-transform"
                :class="{ 'rotate-180': userMenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown menu -->
            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
              >
                <!-- Info utilisateur (cliquable pour éditer) -->
                <button
                  @click="openProfileModal"
                  class="w-full px-4 py-3 border-b hover:bg-gray-50 transition-colors text-left"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-lg">
                      {{ user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900">
                        {{ user?.name || t('auth.name') }}
                      </p>
                      <p class="text-xs text-gray-500 truncate">
                        {{ user?.email }}
                      </p>
                    </div>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </button>

                <div class="py-1">
                  <!-- Déconnexion -->
                  <button
                    @click="handleLogout"
                    class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {{ t('auth.logout') }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal édition profil -->
    <UserProfileModal
      :open="profileModalOpen"
      @close="profileModalOpen = false"
      @updated="profileModalOpen = false"
    />
  </header>
</template>
