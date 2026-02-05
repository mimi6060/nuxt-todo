<script setup lang="ts">
/**
 * Page de connexion
 */

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useI18n()
const { login, isLoading, error, clearError } = useAuth()
const router = useRouter()

const form = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)

async function handleSubmit() {
  clearError()

  const success = await login({
    email: form.email,
    password: form.password
  })

  if (success) {
    router.push('/')
  }
}
</script>

<template>
  <div id="login-page" class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h1 class="text-center text-3xl font-extrabold text-gray-900">
          {{ t('auth.loginTitle') }}
        </h1>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ t('auth.noAccount') }}
          <NuxtLink to="/register" class="font-medium text-blue-600 hover:text-blue-500">
            {{ t('auth.registerLink') }}
          </NuxtLink>
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <!-- Error message -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {{ t(`apiErrors.${error}`, error) }}
        </div>

        <div class="space-y-4">
          <!-- Email -->
          <div>
            <label for="email" class="form-label">{{ t('auth.email') }}</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="form-input"
              :placeholder="t('auth.emailPlaceholder')"
              autocomplete="email"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="form-label">{{ t('auth.password') }}</label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="form-input pr-10"
                :placeholder="t('auth.passwordPlaceholder')"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showPassword = !showPassword"
              >
                <span class="text-gray-400 text-sm">
                  {{ showPassword ? t('auth.hide') : t('auth.show') }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full btn-primary py-3"
        >
          <span v-if="isLoading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ t('common.loading') }}
          </span>
          <span v-else>{{ t('auth.login') }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
