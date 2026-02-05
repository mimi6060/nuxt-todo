/**
 * Guest Middleware - Only for non-authenticated users
 * Redirects to home if already authenticated
 */
export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated.value) {
    return navigateTo('/')
  }
})
