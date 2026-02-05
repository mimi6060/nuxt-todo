# Nuxt Todo App

Application todo list complète et éducative construite avec Nuxt 3.

## Stack Technique

- **Nuxt 3** - Framework Vue meta-framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Pinia** - State management
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Fonctionnalités

- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Filtres par statut, catégorie, priorité
- ✅ Recherche en temps réel
- ✅ Tri multi-critères
- ✅ Priorités et deadlines
- ✅ Catégories et tags
- ✅ Persistance via API + JSON
- ✅ UI responsive avec Tailwind

## Setup

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build pour production
npm run build

# Preview production build
npm run preview
```

## Structure du Projet

```
nuxt-todo/
├── server/          # API routes et utilitaires serveur
├── stores/          # Pinia stores
├── composables/     # Composables réutilisables
├── components/      # Composants Vue
├── pages/           # Pages (file-based routing)
├── types/           # Définitions TypeScript
└── tests/           # Tests unitaires et E2E
```

## Documentation

Voir le [plan d'implémentation](.claude/plans/) pour plus de détails sur l'architecture et les concepts Nuxt couverts.
