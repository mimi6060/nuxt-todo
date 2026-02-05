/**
 * Auth Middleware - Requires authentication
 * Redirects to login if not authenticated
 */
export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
