# CLAUDE.md - Nuxt Todo App

## Allowed Commands

All commands are allowed for this project:

```
allow: *
```

## Project Overview

Nuxt 3 Todo application with:
- PostgreSQL database via Prisma 7 (with adapters)
- JWT authentication (access + refresh tokens)
- Docker containerization
- Server-side pagination and filtering
- Tags as database entities (many-to-many with todos)

## Quick Commands

```bash
# Development
docker-compose up -d          # Start app + database
docker-compose logs -f app    # View logs

# Database
npx prisma migrate dev        # Run migrations locally
npx prisma db seed            # Seed demo data
npx prisma studio             # Database GUI

# Demo account
# Email: demo@example.com
# Password: Demo1234!
```

## Key Directories

- `server/api/` - API routes (auto-routed by Nuxt)
- `server/api/v1/` - Versioned API endpoints
- `server/resources/` - Business logic (TodoResource, CategoryResource, TagResource)
- `server/utils/` - Utilities (auth, errors, cache, prisma)
- `composables/` - Vue composables
- `stores/` - Pinia stores
- `types/` - Shared TypeScript types

## Important Notes

- Prisma 7 requires database adapters (`@prisma/adapter-pg`)
- Use `~` alias for imports in server files
- No cascade deletes - use `onDelete: Restrict`
- Tags are stored as entities, not string arrays
