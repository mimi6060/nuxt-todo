/**
 * Utilitaire Prisma pour Nuxt Server
 * Singleton pattern pour réutiliser la même instance de PrismaClient
 */

import { PrismaClient } from '~/generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { logger } from './logger'

const { Pool } = pg

// Variable globale pour stocker l'instance Prisma (évite les reconnexions multiples en dev)
let prisma: PrismaClient

/**
 * Obtenir l'instance Prisma (singleton)
 *
 * @returns Instance de PrismaClient configurée
 *
 * 📚 Concept pédagogique:
 * - En développement (HMR), on réutilise la même instance pour éviter trop de connexions
 * - En production, on crée une seule instance
 */
export function usePrisma(): PrismaClient {
  if (!prisma) {
    // Créer le pool de connexions PostgreSQL
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)

    // Créer l'instance Prisma avec l'adaptateur
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    })

    logger.info('Prisma Client initialized')
  }

  return prisma
}

/**
 * Fermer la connexion Prisma proprement
 * Utile pour les tests et le shutdown graceful
 */
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect()
    logger.info('Prisma Client disconnected')
  }
}
