#!/bin/sh
set -e

echo "🚀 Starting Nuxt Todo App..."

# Attendre que PostgreSQL soit prêt (double check après healthcheck)
echo "⏳ Waiting for PostgreSQL..."
max_attempts=30
attempt=0
until npx prisma db execute --stdin < /dev/null 2>/dev/null || [ $attempt -ge $max_attempts ]; do
  attempt=$((attempt + 1))
  echo "   PostgreSQL not ready yet (attempt $attempt/$max_attempts)..."
  sleep 2
done

if [ $attempt -ge $max_attempts ]; then
  echo "❌ PostgreSQL connection timeout!"
  exit 1
fi
echo "✅ PostgreSQL is ready!"

# Générer le client Prisma (au cas où le schema a changé)
echo "📦 Generating Prisma client..."
npx prisma generate

# Appliquer les migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed optionnel (seulement si SEED_DB=true)
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seed failed or already seeded"
fi

echo "✨ Database ready!"

# Lancer la commande passée en argument (npm run dev ou npm start)
echo "🎯 Starting application..."
exec "$@"
