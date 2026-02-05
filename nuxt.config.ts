// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  devtools: { enabled: true },

  // Modules Nuxt
  modules: [
    '@nuxtjs/tailwindcss', // Tailwind CSS
    '@pinia/nuxt',         // Pinia state management
    '@nuxtjs/i18n',        // Internationalization
  ],

  // Configuration i18n
  i18n: {
    locales: [
      { code: 'fr', file: 'fr.json', name: 'Français' },
    ],
    defaultLocale: 'fr',
    langDir: 'locales',
    strategy: 'no_prefix',
    vueI18n: './i18n/i18n.config.ts',
  },

  // Configuration Tailwind
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: false, // Désactiver le viewer pour éviter les conflits
  },

  // Configuration Vite pour gérer correctement le CSS et le build
  vite: {
    css: {
      devSourcemap: true,
    },
    build: {
      // Optimisation du build pour le code splitting
      rollupOptions: {
        output: {
          // Configuration des chunks manuels pour les dépendances volumineuses
          manualChunks: {
            // Vendor chunks - séparer les grandes dépendances
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-headlessui': ['@headlessui/vue'],
            'vendor-heroicons': ['@heroicons/vue/24/outline', '@heroicons/vue/24/solid'],
            'vendor-date': ['date-fns'],
          },
        },
      },
      // Augmenter la limite de warning pour les chunks
      chunkSizeWarningLimit: 500,
      // Activer le tree-shaking CSS
      cssCodeSplit: true,
      // Minification optimale
      minify: 'esbuild',
      // Target moderne pour un meilleur tree-shaking
      target: 'esnext',
    },
    // Optimisation des dépendances en dev
    optimizeDeps: {
      include: [
        'vue',
        'pinia',
        '@headlessui/vue',
        'date-fns',
      ],
    },
  },

  // Configuration TypeScript stricte
  typescript: {
    strict: true,
    typeCheck: true, // ✅ Activé avec vue-tsc installé
  },

  // Configuration des imports automatiques
  imports: {
    dirs: ['types/*.ts'],
  },

  // App config
  app: {
    head: {
      title: 'Nuxt Todo App',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Application Todo complète construite avec Nuxt 3, Prisma et PostgreSQL'
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
    },
  },

  // Headers de sécurité pour toutes les routes
  routeRules: {
    '/**': {
      headers: {
        // Empêche le clickjacking
        'X-Frame-Options': 'DENY',
        // Empêche le MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Protection XSS legacy (browsers modernes utilisent CSP)
        'X-XSS-Protection': '1; mode=block',
        // Contrôle les informations envoyées dans le Referrer
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Content Security Policy
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Nécessaire pour Vue/Nuxt dev
          "style-src 'self' 'unsafe-inline'", // Nécessaire pour Tailwind
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
        // Désactive les fonctionnalités du navigateur non utilisées
        'Permissions-Policy': [
          'camera=()',
          'microphone=()',
          'geolocation=()',
          'payment=()',
        ].join(', '),
      },
    },
  },

  // Configuration Nitro pour les headers API
  // Note: /api/** covers both /api/v1/** and legacy /api/resource routes
  nitro: {
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Expose-Headers': 'X-API-Version, X-API-Deprecated, X-API-Deprecation-Notice, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
        },
      },
    },
    // Compression et optimisation du serveur
    compressPublicAssets: true,
  },

  // Configuration des composants pour le lazy loading
  components: {
    dirs: [
      {
        path: '~/components',
        // Lazy loading automatique pour tous les composants
        pathPrefix: false,
      },
    ],
  },

  // Fonctionnalités expérimentales pour optimiser le bundle
  experimental: {
    // Payload extraction pour réduire le HTML initial
    payloadExtraction: true,
    // Tree-shaking des composants non utilisés
    treeshakeClientOnly: true,
  },

  // Configuration du build
  build: {
    // Transpile les modules nécessaires
    transpile: [
      '@headlessui/vue',
      '@heroicons/vue',
    ],
  },
})
