<script setup lang="ts">
/**
 * Modal d'édition du profil utilisateur
 */

import { useFormValidation, createValidationRules } from '~/composables/useFormValidation'
import type { ApiResponse } from '~/types/api'
import type { AuthUser } from '~/composables/useAuth'

interface PasswordChangeResponse {
  success: boolean
}

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()
const { user, isAuthError, handleAuthError, updateUserProfile, getAuthHeaders } = useAuth()

const emit = defineEmits<{
  close: []
  updated: []
}>()

// Form state
const form = reactive({
  name: '',
  email: '',
})

// Password form state
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const loading = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

// Password change state
const showPasswordSection = ref(false)
const passwordLoading = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref<string | null>(null)

// Validation
const rules = createValidationRules(t)
const { errors, validate, clearFieldError } = useFormValidation<typeof form>({
  name: [
    rules.maxLength(t('auth.name'), 100),
  ],
  email: [
    rules.required(t('auth.email')),
  ],
})

// Charger les données utilisateur quand le modal s'ouvre
watch(() => props.open, (isOpen) => {
  if (isOpen && user.value) {
    form.name = user.value.name || ''
    form.email = user.value.email || ''
    success.value = false
    error.value = null
    // Reset password form
    showPasswordSection.value = false
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordSuccess.value = false
    passwordError.value = null
  }
}, { immediate: true })

async function handleSubmit() {
  if (!validate(form)) return

  loading.value = true
  error.value = null
  success.value = false

  try {
    const response = await $fetch<ApiResponse<AuthUser>>('/api/auth/profile', {
      method: 'PUT',
      body: {
        name: form.name || null,
      },
      headers: getAuthHeaders()
    })

    if (response.success) {
      // Mettre à jour le user local
      updateUserProfile({ name: form.name || null })
      success.value = true
      emit('updated')

      // Fermer après un délai
      setTimeout(() => {
        emit('close')
      }, 1500)
    }
  } catch (err: unknown) {
    if (isAuthError(err)) {
      handleAuthError()
      return
    }
    const fetchError = err as { data?: { data?: { code?: string } } }
    error.value = fetchError.data?.data?.code || 'SERVER_ERROR'
  } finally {
    loading.value = false
  }
}

async function handleChangePassword() {
  passwordError.value = null
  passwordSuccess.value = false

  // Validation
  if (!passwordForm.currentPassword) {
    passwordError.value = 'CURRENT_PASSWORD_REQUIRED'
    return
  }
  if (!passwordForm.newPassword) {
    passwordError.value = 'NEW_PASSWORD_REQUIRED'
    return
  }
  if (passwordForm.newPassword.length < 8) {
    passwordError.value = 'PASSWORD_TOO_SHORT'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'PASSWORDS_DO_NOT_MATCH'
    return
  }

  passwordLoading.value = true

  try {
    const response = await $fetch<ApiResponse<PasswordChangeResponse>>('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      headers: getAuthHeaders()
    })

    if (response.success) {
      passwordSuccess.value = true
      // Reset password fields
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''

      // Hide section after success
      setTimeout(() => {
        showPasswordSection.value = false
        passwordSuccess.value = false
      }, 2000)
    }
  } catch (err: unknown) {
    if (isAuthError(err)) {
      handleAuthError()
      return
    }
    const fetchError = err as { data?: { data?: { code?: string } } }
    passwordError.value = fetchError.data?.data?.code || 'PASSWORD_CHANGE_ERROR'
  } finally {
    passwordLoading.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="handleClose"
      >
        <Transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            class="bg-white rounded-xl shadow-xl w-full max-w-md"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b">
              <h2 class="text-xl font-semibold text-gray-900">
                {{ t('user.editProfile') }}
              </h2>
              <button
                @click="handleClose"
                class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
              <!-- Avatar -->
              <div class="flex justify-center mb-6">
                <div class="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-3xl">
                  {{ form.name?.charAt(0)?.toUpperCase() || form.email?.charAt(0)?.toUpperCase() || '?' }}
                </div>
              </div>

              <!-- Nom -->
              <div>
                <label for="profile-name" class="form-label">
                  {{ t('auth.name') }}
                  <span class="text-gray-400 font-normal">({{ t('auth.optional') }})</span>
                </label>
                <input
                  id="profile-name"
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-500': errors.name }"
                  :placeholder="t('auth.namePlaceholder')"
                  maxlength="100"
                  @input="clearFieldError('name')"
                />
                <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
              </div>

              <!-- Email (lecture seule) -->
              <div>
                <label for="profile-email" class="form-label">
                  {{ t('auth.email') }}
                </label>
                <input
                  id="profile-email"
                  v-model="form.email"
                  type="email"
                  class="form-input bg-gray-50 cursor-not-allowed"
                  disabled
                />
                <p class="text-xs text-gray-500 mt-1">
                  {{ t('user.emailCannotChange') }}
                </p>
              </div>

              <!-- Section changement de mot de passe -->
              <div class="border-t pt-4 mt-4">
                <button
                  type="button"
                  @click="showPasswordSection = !showPasswordSection"
                  class="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {{ t('user.changePassword') }}
                  </span>
                  <svg
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': showPasswordSection }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <Transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 -translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-2"
                >
                  <div v-if="showPasswordSection" class="mt-4 space-y-3">
                    <!-- Mot de passe actuel -->
                    <div>
                      <label for="current-password" class="form-label text-sm">
                        {{ t('user.currentPassword') }}
                      </label>
                      <input
                        id="current-password"
                        v-model="passwordForm.currentPassword"
                        type="password"
                        class="form-input"
                        :placeholder="t('user.currentPasswordPlaceholder')"
                      />
                    </div>

                    <!-- Nouveau mot de passe -->
                    <div>
                      <label for="new-password" class="form-label text-sm">
                        {{ t('user.newPassword') }}
                      </label>
                      <input
                        id="new-password"
                        v-model="passwordForm.newPassword"
                        type="password"
                        class="form-input"
                        :placeholder="t('user.newPasswordPlaceholder')"
                      />
                      <p class="text-xs text-gray-500 mt-1">
                        {{ t('auth.passwordHint') }}
                      </p>
                    </div>

                    <!-- Confirmer mot de passe -->
                    <div>
                      <label for="confirm-password" class="form-label text-sm">
                        {{ t('auth.confirmPassword') }}
                      </label>
                      <input
                        id="confirm-password"
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        class="form-input"
                        :placeholder="t('auth.confirmPasswordPlaceholder')"
                      />
                    </div>

                    <!-- Message succès mot de passe -->
                    <div v-if="passwordSuccess" class="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ t('user.passwordChanged') }}
                    </div>

                    <!-- Message erreur mot de passe -->
                    <div v-if="passwordError" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {{ t(`apiErrors.${passwordError}`, passwordError) }}
                    </div>

                    <!-- Bouton changer mot de passe -->
                    <button
                      type="button"
                      @click="handleChangePassword"
                      :disabled="passwordLoading"
                      class="w-full btn-secondary text-sm disabled:opacity-50"
                    >
                      <span v-if="passwordLoading" class="flex items-center justify-center gap-2">
                        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {{ t('common.loading') }}
                      </span>
                      <span v-else>{{ t('user.updatePassword') }}</span>
                    </button>
                  </div>
                </Transition>
              </div>

              <!-- Message de succès -->
              <div v-if="success" class="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ t('user.profileUpdated') }}
              </div>

              <!-- Message d'erreur -->
              <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {{ t(`apiErrors.${error}`, error) }}
              </div>

              <!-- Boutons -->
              <div class="flex gap-3 pt-4">
                <button
                  type="submit"
                  :disabled="loading"
                  class="flex-1 btn-primary disabled:opacity-50"
                >
                  <span v-if="loading" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {{ t('common.loading') }}
                  </span>
                  <span v-else>{{ t('common.save') }}</span>
                </button>
                <button
                  type="button"
                  @click="handleClose"
                  class="btn-secondary"
                >
                  {{ t('common.cancel') }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
