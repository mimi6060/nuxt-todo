# Utilise Node.js 20 (LTS) sur Alpine Linux (léger)
FROM node:20-alpine

# Installe les dépendances système nécessaires pour Prisma
RUN apk add --no-cache libc6-compat openssl

# Définit le répertoire de travail
WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installe les dépendances
RUN npm ci

# Génère le client Prisma
RUN npx prisma generate

# Copie le script d'entrée
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copie le reste du code
COPY . .

# Expose le port 3000
EXPOSE 3000

# Utilise le script d'entrée
ENTRYPOINT ["docker-entrypoint.sh"]

# Commande par défaut (sera overridée par docker-compose)
CMD ["npm", "run", "dev"]
