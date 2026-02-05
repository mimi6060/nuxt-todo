import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

// Hash password directly (can't use auth.ts because it depends on Nuxt)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Début du seeding...')

  // Nettoyer les données existantes (dans l'ordre à cause des FK)
  await prisma.todo.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.category.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Nettoyage des anciennes données')

  // Créer un utilisateur de démonstration
  const hashedPassword = await hashPassword('Demo1234!')
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Utilisateur Démo',
    },
  })
  console.log(`✅ Utilisateur démo créé: ${demoUser.email}`)

  // Créer les catégories pour l'utilisateur démo
  // Utiliser les valeurs hex pour les couleurs (comme dans AVAILABLE_COLORS)
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Travail',
        color: '#3B82F6', // blue
        icon: 'briefcase',
        userId: demoUser.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Personnel',
        color: '#10B981', // green
        icon: 'user',
        userId: demoUser.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Courses',
        color: '#8B5CF6', // purple
        icon: 'shopping-cart',
        userId: demoUser.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Santé',
        color: '#EF4444', // red
        icon: 'heart',
        userId: demoUser.id,
      },
    }),
  ])
  console.log(`✅ ${categories.length} catégories créées`)

  // Créer les tags pour l'utilisateur démo
  const tagNames = [
    'urgent', 'rapport', 'réunion', 'hebdo', 'code-review',
    'apprentissage', 'dev', 'lecture', 'photos', 'alimentaire',
    'santé', 'rdv', 'dentiste', 'sport', 'running'
  ]

  const tags: Record<string, { id: string }> = {}
  for (const name of tagNames) {
    const tag = await prisma.tag.create({
      data: {
        name,
        userId: demoUser.id,
      }
    })
    tags[name] = { id: tag.id }
  }
  console.log(`✅ ${tagNames.length} tags créés`)

  // Créer des todos d'exemple
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const todos = await Promise.all([
    // Todos de travail
    prisma.todo.create({
      data: {
        title: 'Finir le rapport trimestriel',
        description: 'Analyser les chiffres du Q4 et rédiger le rapport pour la direction',
        priority: 'HIGH',
        categories: { connect: [{ id: categories[0].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['urgent'], tags['rapport']] },
        deadline: tomorrow,
        completed: false,
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Réunion équipe projet',
        description: 'Point hebdomadaire sur l\'avancement du projet Nuxt Todo',
        priority: 'MEDIUM',
        categories: { connect: [{ id: categories[0].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['réunion'], tags['hebdo']] },
        deadline: nextWeek,
        completed: false,
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Review code PR #123',
        description: 'Valider les changements de la pull request',
        priority: 'MEDIUM',
        categories: { connect: [{ id: categories[0].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['code-review']] },
        completed: true,
        completedAt: new Date(),
      },
    }),

    // Todos personnels
    prisma.todo.create({
      data: {
        title: 'Apprendre Nuxt 3',
        description: 'Suivre le tutoriel complet et construire une todo app',
        priority: 'HIGH',
        categories: { connect: [{ id: categories[1].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['apprentissage'], tags['dev']] },
        completed: false,
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Lire "Clean Code"',
        description: 'Continuer la lecture, actuellement au chapitre 5',
        priority: 'LOW',
        categories: { connect: [{ id: categories[1].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['lecture'], tags['dev']] },
        completed: false,
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Organiser les photos de vacances',
        priority: 'LOW',
        categories: { connect: [{ id: categories[1].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['photos']] },
        completed: true,
        completedAt: yesterday,
      },
    }),

    // Courses
    prisma.todo.create({
      data: {
        title: 'Acheter du lait',
        description: 'Lait demi-écrémé, 2 bouteilles',
        priority: 'MEDIUM',
        categories: { connect: [{ id: categories[2].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['alimentaire']] },
        deadline: tomorrow,
        completed: false,
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Pharmacie',
        description: 'Récupérer ordonnance médecin',
        priority: 'HIGH',
        categories: { connect: [{ id: categories[2].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['santé']] },
        deadline: tomorrow,
        completed: false,
      },
    }),

    // Santé
    prisma.todo.create({
      data: {
        title: 'RDV dentiste',
        description: 'Contrôle annuel - Dr. Martin',
        priority: 'URGENT',
        categories: { connect: [{ id: categories[3].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['rdv'], tags['dentiste']] },
        deadline: yesterday, // En retard!
        completed: false,
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Séance sport',
        description: 'Running 30 minutes',
        priority: 'MEDIUM',
        categories: { connect: [{ id: categories[3].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['sport'], tags['running']] },
        completed: true,
        completedAt: new Date(),
      },
    }),
    prisma.todo.create({
      data: {
        title: 'Prendre rendez-vous ophtalmo',
        priority: 'LOW',
        categories: { connect: [{ id: categories[3].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['rdv']] },
        completed: false,
      },
    }),
    // Todo avec plusieurs catégories (exemple many-to-many)
    prisma.todo.create({
      data: {
        title: 'Préparer voyage professionnel',
        description: 'Réserver hôtel et organiser réunions clients',
        priority: 'HIGH',
        categories: { connect: [{ id: categories[0].id }, { id: categories[1].id }] },
        userId: demoUser.id,
        tags: { connect: [tags['réunion']] },
        deadline: nextWeek,
        completed: false,
      },
    }),
  ])

  console.log(`✅ ${todos.length} todos créés`)

  // Statistiques
  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    active: todos.filter((t) => !t.completed).length,
    urgent: todos.filter((t) => t.priority === 'URGENT').length,
    overdue: todos.filter(
      (t) => !t.completed && t.deadline && t.deadline < now
    ).length,
  }

  console.log('\n📊 Statistiques:')
  console.log(`  Total: ${stats.total}`)
  console.log(`  Complétés: ${stats.completed}`)
  console.log(`  Actifs: ${stats.active}`)
  console.log(`  Urgents: ${stats.urgent}`)
  console.log(`  En retard: ${stats.overdue}`)

  console.log('\n🔐 Compte démo:')
  console.log(`  Email: demo@example.com`)
  console.log(`  Mot de passe: Demo1234!`)

  console.log('\n🎉 Seeding terminé avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
