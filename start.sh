#!/bin/bash

echo "🚀 Starting Nuxt Todo App with Docker..."

# Arrêter et supprimer les containers existants
echo "📦 Stopping and removing existing containers..."
docker-compose down

# Rebuilder et démarrer les containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Attendre que les services soient prêts
echo "⏳ Waiting for services to be ready..."
sleep 5

# Afficher les logs
echo "📋 Checking logs..."
docker-compose logs app --tail 20

# Afficher l'état
echo ""
echo "✅ Application started!"
echo "📍 Nuxt app: http://localhost:3000"
echo "📍 PostgreSQL: localhost:5432"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Stop: docker-compose down"
echo "  - Restart: docker-compose restart app"
echo ""
