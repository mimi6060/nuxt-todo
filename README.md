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

# Démarrer avec Docker (PostgreSQL + App)
docker-compose up --build -d

# Ou démarrer le serveur de développement (nécessite PostgreSQL)
npm run dev

# Build pour production
npm run build

# Preview production build
npm run preview
```

## Compte de démonstration

Après avoir lancé l'application avec `docker-compose up`, un compte de démonstration est créé automatiquement :

| Email | Mot de passe |
|-------|--------------|
| `demo@example.com` | `Demo1234!` |

> **Note**: Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.

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
