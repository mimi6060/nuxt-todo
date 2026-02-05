# 🐳 Guide Docker - Nuxt Todo App

Guide pédagogique pour comprendre et utiliser Docker dans ce projet.

## 📚 Concepts de base

### Qu'est-ce que Docker ?

**Docker** crée des "conteneurs" - des environnements isolés qui contiennent tout ce dont une application a besoin pour fonctionner (code, dépendances, système d'exploitation).

**Avantages** :
- ✅ **Reproductibilité** : Fonctionne pareil partout (dev, production)
- ✅ **Isolation** : Ne pollue pas votre machine avec PostgreSQL
- ✅ **Facilité** : Un seul commande pour tout démarrer
- ✅ **Collaboration** : Même environnement pour toute l'équipe

### Architecture de notre projet

```
┌─────────────────────────────────────┐
│     Votre Machine (Host)            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Docker                      │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │  Container: postgres    │ │ │
│  │  │  PostgreSQL Database    │ │ │
│  │  │  Port: 5432             │ │ │
│  │  └─────────────────────────┘ │ │
│  │           ▲                   │ │
│  │           │ Réseau Docker     │ │
│  │           ▼                   │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │  Container: app         │ │ │
│  │  │  Nuxt Application       │ │ │
│  │  │  Port: 3000             │ │ │
│  │  └─────────────────────────┘ │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

## 🗂️ Fichiers Docker

### 1. `docker-compose.yml` - Orchestration

Ce fichier définit **comment les conteneurs communiquent**.

```yaml
services:
  postgres:          # Service de base de données
    image: postgres:16-alpine    # Image officielle PostgreSQL
    ports:
      - "5432:5432"  # Port HOST:CONTAINER
    environment:     # Variables d'environnement
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: nuxt_todo
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persistance

  app:               # Service application Nuxt
    build: .         # Construit l'image depuis Dockerfile
    ports:
      - "3000:3000"  # Nuxt accessible sur localhost:3000
    depends_on:
      - postgres     # Attend que PostgreSQL soit prêt
```

**Concepts clés** :
- **Services** : Chaque conteneur est un service
- **Ports** : `HOST:CONTAINER` - mapping des ports
- **Volumes** : Sauvegarde les données (survit au redémarrage)
- **depends_on** : Ordre de démarrage des conteneurs
- **healthcheck** : Vérifie que PostgreSQL est prêt avant de démarrer l'app

### 2. `Dockerfile` - Image de l'app

Ce fichier définit **comment construire l'image de l'app Nuxt**.

```dockerfile
FROM node:20-alpine           # Base : Node.js 20
WORKDIR /app                  # Dossier de travail
COPY package*.json ./         # Copie les dépendances
RUN npm ci                    # Installe
RUN npx prisma generate       # Génère le client Prisma
COPY . .                      # Copie tout le code
EXPOSE 3000                   # Expose le port
CMD ["npm", "run", "dev"]     # Commande de démarrage
```

**Concepts clés** :
- **FROM** : Image de base (Node.js)
- **WORKDIR** : Où le code vit dans le conteneur
- **COPY** : Copie fichiers de l'host vers le conteneur
- **RUN** : Exécute une commande pendant le build
- **CMD** : Commande par défaut au démarrage

### 3. `.dockerignore` - Fichiers à exclure

Liste les fichiers à **ne pas copier** dans l'image Docker.

```
node_modules     # Sera réinstallé dans le conteneur
.env             # Secrets, ne jamais copier
.nuxt            # Généré automatiquement
```

## 🚀 Utilisation

### Prérequis

Installez Docker Desktop :
- **macOS** : https://docs.docker.com/desktop/install/mac-install/
- **Windows** : https://docs.docker.com/desktop/install/windows-install/
- **Linux** : https://docs.docker.com/desktop/install/linux-install/

### Commandes principales

#### 1. Démarrer tout (PostgreSQL + App)

```bash
npm run docker:up
```

Équivalent à : `docker-compose up -d`
- `-d` = mode détaché (background)

**Que se passe-t-il ?**
1. Télécharge les images Docker si nécessaire
2. Crée le volume pour PostgreSQL
3. Démarre le conteneur PostgreSQL
4. Construit l'image de l'app Nuxt
5. Démarre le conteneur app

#### 2. Démarrer uniquement PostgreSQL

```bash
npm run docker:db
```

Utile pour développer l'app localement (sans Docker) mais utiliser PostgreSQL dans Docker.

#### 3. Voir les logs

```bash
npm run docker:logs
```

Affiche les logs de tous les conteneurs en temps réel.

#### 4. Arrêter tout

```bash
npm run docker:down
```

Arrête et supprime les conteneurs (les données PostgreSQL sont préservées dans le volume).

#### 5. Reconstruire l'image

```bash
npm run docker:rebuild
```

Utile après modification du Dockerfile ou ajout de dépendances.

## 🗄️ Gestion de la base de données

### Initialiser la base de données

Une fois PostgreSQL démarré, créez les tables :

```bash
npm run prisma:migrate
```

**Que se passe-t-il ?**
1. Lit `prisma/schema.prisma`
2. Génère le SQL pour créer les tables
3. Applique les changements à PostgreSQL
4. Crée un fichier de migration dans `prisma/migrations/`

### Créer des données de test (seed)

Créez d'abord un fichier `prisma/seed.ts` (on le fera plus tard), puis :

```bash
npm run prisma:seed
```

### Visualiser la base de données

```bash
npm run prisma:studio
```

Ouvre une interface web sur http://localhost:5555 pour voir et éditer les données.

## 🔍 Workflows de développement

### Option 1 : Tout dans Docker (recommandé pour débuter)

```bash
# 1. Démarrer tout
npm run docker:up

# 2. Voir les logs
npm run docker:logs

# 3. Créer les tables
npm run prisma:migrate

# 4. Ouvrir http://localhost:3000
```

**Avantages** : Environnement complet isolé
**Inconvénients** : Hot reload peut être lent

### Option 2 : DB dans Docker, App en local (recommandé pour dev)

```bash
# 1. Démarrer PostgreSQL uniquement
npm run docker:db

# 2. Créer les tables
npm run prisma:migrate

# 3. Démarrer l'app localement
npm run dev

# 4. Ouvrir http://localhost:3000
```

**Avantages** : Hot reload rapide, meilleur debugging
**Inconvénients** : Doit avoir Node.js installé localement

### Option 3 : Production

```bash
# Build production
docker-compose -f docker-compose.prod.yml up -d
```

(On créera `docker-compose.prod.yml` plus tard)

## 🐛 Debugging

### Entrer dans un conteneur

```bash
# Entrer dans le conteneur app
docker exec -it nuxt-todo-app sh

# Entrer dans PostgreSQL
docker exec -it nuxt-todo-db psql -U postgres -d nuxt_todo
```

### Voir les conteneurs actifs

```bash
docker ps
```

### Vérifier l'état de PostgreSQL

```bash
docker exec nuxt-todo-db pg_isready -U postgres
```

### Supprimer TOUT (reset complet)

```bash
# Arrêter et supprimer conteneurs + volumes
docker-compose down -v

# Rebuild from scratch
npm run docker:rebuild
```

⚠️ **Attention** : `-v` supprime les données PostgreSQL !

## 🔐 Sécurité

### Variables d'environnement

Les secrets (mots de passe) sont dans :
1. `.env` (local, **jamais** commité dans Git)
2. `docker-compose.yml` (développement seulement)

En production, utilisez :
- Variables d'environnement du serveur
- Docker secrets
- Services de gestion de secrets (Vault, AWS Secrets Manager)

### Changez les mots de passe par défaut !

Dans `docker-compose.yml` et `.env`, changez :
- `POSTGRES_PASSWORD: password` ❌
- `POSTGRES_PASSWORD: mon_mot_de_passe_fort` ✅

## 📊 Volumes Docker

### Qu'est-ce qu'un volume ?

Un **volume** est un espace de stockage géré par Docker qui persiste même si le conteneur est supprimé.

```yaml
volumes:
  postgres_data:    # Nom du volume
    driver: local   # Stocké localement
```

### Voir les volumes

```bash
docker volume ls
```

### Inspecter un volume

```bash
docker volume inspect nuxt-todo_postgres_data
```

### Sauvegarder les données

```bash
# Exporter
docker exec nuxt-todo-db pg_dump -U postgres nuxt_todo > backup.sql

# Restaurer
docker exec -i nuxt-todo-db psql -U postgres nuxt_todo < backup.sql
```

## 🎓 Ressources pour aller plus loin

- [Docker Documentation](https://docs.docker.com/)
- [docker-compose Documentation](https://docs.docker.com/compose/)
- [Prisma + Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)

## 🆘 Problèmes courants

### Port 5432 déjà utilisé

**Erreur** : `Bind for 0.0.0.0:5432 failed: port is already allocated`

**Solution** :
1. PostgreSQL est déjà installé localement → `sudo service postgresql stop`
2. Changez le port dans `docker-compose.yml` : `"5433:5432"`

### "database does not exist"

**Solution** :
```bash
# Recréer la base de données
docker-compose down
docker-compose up -d postgres
npm run prisma:migrate
```

### Hot reload ne fonctionne pas

**Solution** : Utilisez l'option 2 (DB dans Docker, app en local)

---

**Prochaine étape** : Une fois Docker configuré, nous continuerons avec la création des types TypeScript et des API routes avec Prisma!
