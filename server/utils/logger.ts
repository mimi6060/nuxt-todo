/**
 * Logger conditionnel basé sur NODE_ENV
 *
 * En production, seules les erreurs sont loggées.
 * En développement, tous les niveaux de log sont actifs.
 */

const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  info: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => isDev && console.debug(...args),
}
