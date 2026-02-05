/**
 * Composable pour la validation de formulaires
 * Fournit une API réutilisable avec support i18n
 */

export type ValidationRule<T> = (value: T) => string | true
export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[]
}

type ErrorRecord<T> = Partial<Record<keyof T, string>>

export function useFormValidation<T extends Record<string, any>>(
  rules: ValidationRules<T>
) {
  const errors = reactive<ErrorRecord<T>>({}) as ErrorRecord<T>

  /**
   * Valide toutes les données selon les règles définies
   * Retourne true si tout est valide, false sinon
   */
  function validate(data: T): boolean {
    clearErrors()
    let isValid = true

    for (const field in rules) {
      const fieldRules = rules[field]
      if (!fieldRules) continue

      for (const rule of fieldRules) {
        const result = rule(data[field])
        if (result !== true) {
          errors[field as keyof T] = result
          isValid = false
          break // Arrêter à la première erreur pour ce champ
        }
      }
    }

    return isValid
  }

  /**
   * Valide un seul champ
   */
  function validateField(field: keyof T, value: T[keyof T]): boolean {
    const fieldRules = rules[field]
    if (!fieldRules) return true

    for (const rule of fieldRules) {
      const result = rule(value)
      if (result !== true) {
        errors[field] = result
        return false
      }
    }

    delete errors[field]
    return true
  }

  /**
   * Efface toutes les erreurs
   */
  function clearErrors() {
    const keys = Object.keys(errors) as (keyof T)[]
    for (const key of keys) {
      delete errors[key]
    }
  }

  /**
   * Efface l'erreur d'un champ spécifique
   */
  function clearFieldError(field: keyof T) {
    delete errors[field]
  }

  /**
   * Vérifie si un champ a une erreur
   */
  function hasError(field: keyof T): boolean {
    return !!errors[field]
  }

  /**
   * Vérifie si le formulaire a des erreurs
   */
  const hasErrors = computed(() => Object.keys(errors).length > 0)

  return {
    errors: readonly(errors) as Readonly<ErrorRecord<T>>,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasError,
    hasErrors,
  }
}

/**
 * Factory pour créer des règles de validation avec i18n
 * Usage: const rules = createValidationRules(t)
 */
export function createValidationRules(t: (key: string, params?: Record<string, any>) => string) {
  return {
    required: (fieldName: string) => (value: any): string | true => {
      if (value === null || value === undefined || value === '') {
        return t('validation.fieldRequired', { field: fieldName })
      }
      if (typeof value === 'string' && !value.trim()) {
        return t('validation.fieldRequired', { field: fieldName })
      }
      return true
    },

    minLength: (fieldName: string, min: number) => (value: string): string | true => {
      if (value && value.length < min) {
        return t('validation.minLength', { field: fieldName, min })
      }
      return true
    },

    maxLength: (fieldName: string, max: number) => (value: string): string | true => {
      if (value && value.length > max) {
        return t('validation.maxLength', { field: fieldName, max })
      }
      return true
    },

    email: () => (value: string): string | true => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return t('validation.invalidEmail')
      }
      return true
    },
  }
}
