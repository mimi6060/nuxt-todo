/**
 * useAuth - Composable for authentication
 *
 * Provides:
 * - Login/Register/Logout functionality
 * - Token management (access + refresh)
 * - Auto token refresh
 * - Current user state
 */

import type { ApiResponse } from '~/types/api'

// ============================================
// TYPES
// ============================================

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name?: string
}

interface AuthResponse {
  user: AuthUser
  tokens: AuthTokens
}

// ============================================
// STATE
// ============================================

const user = ref<AuthUser | null>(null)
const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Token refresh timer
let refreshTimer: ReturnType<typeof setTimeout> | null = null
// Prevent concurrent token refresh
let refreshPromise: Promise<boolean> | null = null
// Flag to prevent multiple redirects
let isRedirecting = false

// ============================================
// COMPUTED
// ============================================

const isAuthenticated = computed(() => !!user.value && !!accessToken.value)

// ============================================
// HELPERS
// ============================================

function clearAuth() {
  user.value = null
  accessToken.value = null
  refreshToken.value = null

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }

  // Clear from localStorage
  if (import.meta.client) {
    localStorage.removeItem('auth_access_token')
    localStorage.removeItem('auth_refresh_token')
    localStorage.removeItem('auth_user')
  }
}

/**
 * Handle authentication errors (401, token expired, etc.)
 * Clears auth state and redirects to login page
 */
function handleAuthError() {
  // Prevent multiple redirects
  if (isRedirecting) return

  isRedirecting = true
  clearAuth()

  // Redirect to login (client-side only)
  if (import.meta.client) {
    // Use setTimeout to allow current execution to complete
    setTimeout(() => {
      isRedirecting = false
      navigateTo('/login')
    }, 0)
  }
}

/**
 * Check if an error is an authentication error (401)
 */
function isAuthError(error: any): boolean {
  if (!error) return false

  // Check HTTP status code
  const statusCode = error.statusCode || error.status || error.data?.statusCode
  if (statusCode === 401) return true

  // Check error codes
  const errorCode = error.data?.data?.code || error.data?.code || error.code
  const authErrorCodes = [
    'AUTH_TOKEN_REQUIRED',
    'AUTH_TOKEN_INVALID',
    'AUTH_TOKEN_EXPIRED',
    'AUTH_USER_NOT_FOUND',
    'AUTH_NOT_AUTHENTICATED',
    'AUTH_REFRESH_TOKEN_INVALID'
  ]
  if (authErrorCodes.includes(errorCode)) return true

  return false
}

function saveAuth(authUser: AuthUser, tokens: AuthTokens) {
  user.value = authUser
  accessToken.value = tokens.accessToken
  refreshToken.value = tokens.refreshToken

  // Save to localStorage
  if (import.meta.client) {
    localStorage.setItem('auth_access_token', tokens.accessToken)
    localStorage.setItem('auth_refresh_token', tokens.refreshToken)
    localStorage.setItem('auth_user', JSON.stringify(authUser))
  }

  // Schedule token refresh (refresh 1 minute before expiry)
  scheduleTokenRefresh(tokens.expiresIn)
}

function scheduleTokenRefresh(expiresIn: number) {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  // Refresh 1 minute before token expires
  const refreshTime = (expiresIn - 60) * 1000

  if (refreshTime > 0) {
    refreshTimer = setTimeout(async () => {
      await doRefreshToken()
    }, refreshTime)
  }
}

async function doRefreshToken(): Promise<boolean> {
  if (!refreshToken.value) return false

  // Prevent concurrent refresh requests - return existing promise if one is in progress
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const response = await $fetch<ApiResponse<{ tokens: AuthTokens }>>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refreshToken.value }
      })

      if (response.success && response.data) {
        accessToken.value = response.data.tokens.accessToken
        refreshToken.value = response.data.tokens.refreshToken

        if (import.meta.client) {
          localStorage.setItem('auth_access_token', response.data.tokens.accessToken)
          localStorage.setItem('auth_refresh_token', response.data.tokens.refreshToken)
        }

        scheduleTokenRefresh(response.data.tokens.expiresIn)
        return true
      }
      return false
    } catch {
      // Refresh failed, clear auth
      clearAuth()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ============================================
// ACTIONS
// ============================================

async function login(credentials: LoginCredentials): Promise<boolean> {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<ApiResponse<AuthResponse>>('/api/auth/login', {
      method: 'POST',
      body: credentials
    })

    if (response.success && response.data) {
      saveAuth(response.data.user, response.data.tokens)
      return true
    }

    error.value = 'Login failed'
    return false
  } catch (e: any) {
    error.value = e.data?.data?.code || 'AUTH_INVALID_CREDENTIALS'
    return false
  } finally {
    isLoading.value = false
  }
}

async function register(credentials: RegisterCredentials): Promise<boolean> {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<ApiResponse<AuthResponse>>('/api/auth/register', {
      method: 'POST',
      body: credentials
    })

    if (response.success && response.data) {
      saveAuth(response.data.user, response.data.tokens)
      return true
    }

    error.value = 'Registration failed'
    return false
  } catch (e: any) {
    error.value = e.data?.data?.code || 'SERVER_ERROR'
    return false
  } finally {
    isLoading.value = false
  }
}

async function logout(allDevices = false): Promise<void> {
  try {
    if (accessToken.value) {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.value}`
        },
        body: {
          refreshToken: refreshToken.value,
          allDevices
        }
      })
    }
  } catch {
    // Ignore logout errors
  } finally {
    clearAuth()
  }
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!accessToken.value) return null

  try {
    const response = await $fetch<ApiResponse<AuthUser>>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken.value}`
      }
    })

    if (response.success && response.data) {
      user.value = response.data
      return response.data
    }
  } catch {
    // Token might be invalid
    clearAuth()
  }

  return null
}

function initAuth() {
  if (!import.meta.client) return

  // Restore from localStorage
  const savedToken = localStorage.getItem('auth_access_token')
  const savedRefresh = localStorage.getItem('auth_refresh_token')
  const savedUser = localStorage.getItem('auth_user')

  if (savedToken && savedRefresh && savedUser) {
    accessToken.value = savedToken
    refreshToken.value = savedRefresh
    user.value = JSON.parse(savedUser)

    // Verify token is still valid
    fetchCurrentUser()
  }
}

/**
 * Get authorization headers for API calls
 */
function getAuthHeaders(): Record<string, string> {
  if (!accessToken.value) return {}
  return { Authorization: `Bearer ${accessToken.value}` }
}

/**
 * Update user profile locally (after API update)
 */
function updateUserProfile(updates: Partial<AuthUser>) {
  if (!user.value) return

  user.value = { ...user.value, ...updates }

  // Update localStorage
  if (import.meta.client) {
    localStorage.setItem('auth_user', JSON.stringify(user.value))
  }
}

// ============================================
// COMPOSABLE
// ============================================

export function useAuth() {
  // Initialize on first use (client-side)
  if (import.meta.client && !accessToken.value) {
    initAuth()
  }

  return {
    // State
    user: readonly(user),
    isAuthenticated,
    isLoading: readonly(isLoading),
    error: readonly(error),
    accessToken: readonly(accessToken),

    // Actions
    login,
    register,
    logout,
    fetchCurrentUser,
    getAuthHeaders,

    // Error handling
    handleAuthError,
    isAuthError,

    // Profile
    updateUserProfile,

    // Utils
    clearError: () => { error.value = null }
  }
}
