import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock H3 functions as globals (Nuxt auto-imports these)
const mockGetQuery = vi.fn()
const mockReadBody = vi.fn()
const mockGetRouterParam = vi.fn()
const mockCreateError = vi.fn((options) => {
  const error = new Error(options.message) as Error & { statusCode: number; data: unknown }
  error.statusCode = options.statusCode
  error.data = options.data
  return error
})

// Mock Prisma (must be defined before stubGlobal)
const mockPrisma = {
  todo: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
}

// Mock serializeTodo function (auto-imported by Nuxt)
const mockSerializeTodo = vi.fn((todo) => ({
  id: todo.id,
  title: todo.title,
  description: todo.description,
  completed: todo.completed,
  priority: todo.priority,
  categoryId: todo.categoryId,
  tags: todo.tags,
  deadline: todo.deadline?.toISOString?.() || todo.deadline || null,
  createdAt: todo.createdAt?.toISOString?.() || todo.createdAt,
  updatedAt: todo.updatedAt?.toISOString?.() || todo.updatedAt,
  completedAt: todo.completedAt?.toISOString?.() || todo.completedAt || null,
  category: todo.category ? {
    id: todo.category.id,
    name: todo.category.name,
    color: todo.category.color,
    icon: todo.category.icon,
  } : undefined,
}))

// Set up global mocks for Nuxt auto-imported functions
vi.stubGlobal('getQuery', mockGetQuery)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', mockGetRouterParam)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('usePrisma', () => mockPrisma)
vi.stubGlobal('serializeTodo', mockSerializeTodo)

// Also mock the module import for cases where it's imported directly
vi.mock('~/server/utils/prisma', () => ({
  usePrisma: () => mockPrisma,
}))

vi.mock('~/server/utils/serializers', () => ({
  serializeTodo: (todo: unknown) => mockSerializeTodo(todo),
}))

// Import after mocks
import { TodoResource } from '~/server/resources/TodoResource'
import type { H3Event } from 'h3'

// ============================================
// HELPERS
// ============================================

const createMockEvent = (): H3Event => ({}) as H3Event

const createMockCategory = (overrides = {}) => ({
  id: 'cat-1',
  name: 'Work',
  color: '#3B82F6',
  icon: 'briefcase',
  ...overrides,
})

const createMockTodo = (overrides = {}) => ({
  id: 'todo-1',
  title: 'Test Todo',
  description: 'Test description',
  completed: false,
  priority: 'MEDIUM',
  categoryId: 'cat-1',
  tags: ['test'],
  deadline: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  completedAt: null,
  category: createMockCategory(),
  ...overrides,
})

// ============================================
// TESTS
// ============================================

describe('TodoResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // VALIDATION TESTS
  // ============================================

  describe('Validation', () => {
    describe('create - titre requis', () => {
      it('should throw TODO_TITLE_REQUIRED when title is missing', async () => {
        const event = createMockEvent()
        mockReadBody.mockResolvedValue({
          categoryId: 'cat-1',
          // title is missing
        })

        await expect(TodoResource.create(event)).rejects.toMatchObject({
          statusCode: 400,
          data: { code: 'TODO_TITLE_REQUIRED' },
        })
      })

      it('should throw TODO_TITLE_REQUIRED when title is empty string', async () => {
        const event = createMockEvent()
        mockReadBody.mockResolvedValue({
          title: '',
          categoryId: 'cat-1',
        })

        await expect(TodoResource.create(event)).rejects.toMatchObject({
          statusCode: 400,
          data: { code: 'TODO_TITLE_REQUIRED' },
        })
      })

      it('should throw TODO_TITLE_REQUIRED when title is only whitespace', async () => {
        const event = createMockEvent()
        mockReadBody.mockResolvedValue({
          title: '   ',
          categoryId: 'cat-1',
        })

        await expect(TodoResource.create(event)).rejects.toMatchObject({
          statusCode: 400,
          data: { code: 'TODO_TITLE_REQUIRED' },
        })
      })
    })

    describe('create - categorie requise', () => {
      it('should throw TODO_CATEGORY_REQUIRED when categoryId is missing', async () => {
        const event = createMockEvent()
        mockReadBody.mockResolvedValue({
          title: 'Valid Title',
          // categoryId is missing
        })

        await expect(TodoResource.create(event)).rejects.toMatchObject({
          statusCode: 400,
          data: { code: 'TODO_CATEGORY_REQUIRED' },
        })
      })

      it('should throw TODO_CATEGORY_REQUIRED when categoryId is null', async () => {
        const event = createMockEvent()
        mockReadBody.mockResolvedValue({
          title: 'Valid Title',
          categoryId: null,
        })

        await expect(TodoResource.create(event)).rejects.toMatchObject({
          statusCode: 400,
          data: { code: 'TODO_CATEGORY_REQUIRED' },
        })
      })
    })

    describe('create - categorie inexistante', () => {
      it('should throw CATEGORY_NOT_FOUND when category does not exist', async () => {
        const event = createMockEvent()
        mockReadBody.mockResolvedValue({
          title: 'Valid Title',
          categoryId: 'non-existent-cat',
        })
        mockPrisma.category.findUnique.mockResolvedValue(null)

        await expect(TodoResource.create(event)).rejects.toMatchObject({
          statusCode: 404,
          data: { code: 'CATEGORY_NOT_FOUND' },
        })
      })
    })

    describe('update - categorie inexistante', () => {
      it('should throw CATEGORY_NOT_FOUND when updating to non-existent category', async () => {
        const event = createMockEvent()
        const existingTodo = createMockTodo()

        mockGetRouterParam.mockReturnValue('todo-1')
        mockReadBody.mockResolvedValue({
          categoryId: 'non-existent-cat',
        })
        mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
        mockPrisma.category.findUnique.mockResolvedValue(null)

        await expect(TodoResource.update(event)).rejects.toMatchObject({
          statusCode: 404,
          data: { code: 'CATEGORY_NOT_FOUND' },
        })
      })
    })
  })

  // ============================================
  // CRUD TESTS
  // ============================================

  describe('CRUD Operations', () => {
    describe('create - avec donnees valides', () => {
      it('should create a todo with valid data', async () => {
        const event = createMockEvent()
        const category = createMockCategory()
        const createdTodo = createMockTodo({
          title: 'New Todo',
          description: 'New description',
          priority: 'HIGH',
          tags: ['urgent'],
        })

        mockReadBody.mockResolvedValue({
          title: 'New Todo',
          description: 'New description',
          priority: 'HIGH',
          categoryId: 'cat-1',
          tags: ['urgent'],
        })
        mockPrisma.category.findUnique.mockResolvedValue(category)
        mockPrisma.todo.create.mockResolvedValue(createdTodo)

        const result = await TodoResource.create(event)

        expect(result.success).toBe(true)
        expect(result.data!.title).toBe('New Todo')
        expect(result.data!.description).toBe('New description')
        expect(result.data!.priority).toBe('HIGH')
        expect(mockPrisma.todo.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: 'New Todo',
            description: 'New description',
            priority: 'HIGH',
            tags: ['urgent'],
          }),
          include: { category: true },
        })
      })

      it('should trim title and description', async () => {
        const event = createMockEvent()
        const category = createMockCategory()
        const createdTodo = createMockTodo({
          title: 'Trimmed Title',
          description: 'Trimmed description',
        })

        mockReadBody.mockResolvedValue({
          title: '  Trimmed Title  ',
          description: '  Trimmed description  ',
          categoryId: 'cat-1',
        })
        mockPrisma.category.findUnique.mockResolvedValue(category)
        mockPrisma.todo.create.mockResolvedValue(createdTodo)

        await TodoResource.create(event)

        expect(mockPrisma.todo.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: 'Trimmed Title',
            description: 'Trimmed description',
          }),
          include: { category: true },
        })
      })

      it('should use default priority MEDIUM when not specified', async () => {
        const event = createMockEvent()
        const category = createMockCategory()
        const createdTodo = createMockTodo({ priority: 'MEDIUM' })

        mockReadBody.mockResolvedValue({
          title: 'Todo without priority',
          categoryId: 'cat-1',
        })
        mockPrisma.category.findUnique.mockResolvedValue(category)
        mockPrisma.todo.create.mockResolvedValue(createdTodo)

        await TodoResource.create(event)

        expect(mockPrisma.todo.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            priority: 'MEDIUM',
          }),
          include: { category: true },
        })
      })

      it('should handle deadline as Date', async () => {
        const event = createMockEvent()
        const category = createMockCategory()
        const deadline = new Date('2024-12-31T23:59:59Z')
        const createdTodo = createMockTodo({ deadline })

        mockReadBody.mockResolvedValue({
          title: 'Todo with deadline',
          categoryId: 'cat-1',
          deadline: '2024-12-31T23:59:59Z',
        })
        mockPrisma.category.findUnique.mockResolvedValue(category)
        mockPrisma.todo.create.mockResolvedValue(createdTodo)

        await TodoResource.create(event)

        expect(mockPrisma.todo.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            deadline: expect.any(Date),
          }),
          include: { category: true },
        })
      })
    })

    describe('update - mise a jour todo', () => {
      it('should update todo with valid data', async () => {
        const event = createMockEvent()
        const existingTodo = createMockTodo()
        const updatedTodo = createMockTodo({
          title: 'Updated Title',
          description: 'Updated description',
        })

        mockGetRouterParam.mockReturnValue('todo-1')
        mockReadBody.mockResolvedValue({
          title: 'Updated Title',
          description: 'Updated description',
        })
        mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
        mockPrisma.todo.update.mockResolvedValue(updatedTodo)

        const result = await TodoResource.update(event)

        expect(result.success).toBe(true)
        expect(result.data!.title).toBe('Updated Title')
        expect(mockPrisma.todo.update).toHaveBeenCalledWith({
          where: { id: 'todo-1' },
          data: expect.objectContaining({
            title: 'Updated Title',
            description: 'Updated description',
          }),
          include: { category: true },
        })
      })

      it('should update completed status and set completedAt', async () => {
        const event = createMockEvent()
        const existingTodo = createMockTodo({ completed: false })
        const completedAt = new Date()
        const updatedTodo = createMockTodo({ completed: true, completedAt })

        mockGetRouterParam.mockReturnValue('todo-1')
        mockReadBody.mockResolvedValue({
          completed: true,
        })
        mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
        mockPrisma.todo.update.mockResolvedValue(updatedTodo)

        const result = await TodoResource.update(event)

        expect(result.success).toBe(true)
        expect(mockPrisma.todo.update).toHaveBeenCalledWith({
          where: { id: 'todo-1' },
          data: expect.objectContaining({
            completed: true,
            completedAt: expect.any(Date),
          }),
          include: { category: true },
        })
      })

      it('should set completedAt to null when uncompleting', async () => {
        const event = createMockEvent()
        const existingTodo = createMockTodo({ completed: true, completedAt: new Date() })
        const updatedTodo = createMockTodo({ completed: false, completedAt: null })

        mockGetRouterParam.mockReturnValue('todo-1')
        mockReadBody.mockResolvedValue({
          completed: false,
        })
        mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
        mockPrisma.todo.update.mockResolvedValue(updatedTodo)

        await TodoResource.update(event)

        expect(mockPrisma.todo.update).toHaveBeenCalledWith({
          where: { id: 'todo-1' },
          data: expect.objectContaining({
            completed: false,
            completedAt: null,
          }),
          include: { category: true },
        })
      })

      it('should update category when valid', async () => {
        const event = createMockEvent()
        const existingTodo = createMockTodo({ categoryId: 'cat-1' })
        const newCategory = createMockCategory({ id: 'cat-2', name: 'Personal' })
        const updatedTodo = createMockTodo({
          categoryId: 'cat-2',
          category: newCategory,
        })

        mockGetRouterParam.mockReturnValue('todo-1')
        mockReadBody.mockResolvedValue({
          categoryId: 'cat-2',
        })
        mockPrisma.todo.findUnique.mockResolvedValue(existingTodo)
        mockPrisma.category.findUnique.mockResolvedValue(newCategory)
        mockPrisma.todo.update.mockResolvedValue(updatedTodo)

        const result = await TodoResource.update(event)

        expect(result.success).toBe(true)
        expect(mockPrisma.todo.update).toHaveBeenCalledWith({
          where: { id: 'todo-1' },
          data: expect.objectContaining({
            category: { connect: { id: 'cat-2' } },
          }),
          include: { category: true },
        })
      })

      it('should throw TODO_NOT_FOUND when todo does not exist', async () => {
        const event = createMockEvent()

        mockGetRouterParam.mockReturnValue('non-existent')
        mockReadBody.mockResolvedValue({
          title: 'Update attempt',
        })
        mockPrisma.todo.findUnique.mockResolvedValue(null)

        await expect(TodoResource.update(event)).rejects.toMatchObject({
          statusCode: 404,
          data: { code: 'TODO_NOT_FOUND' },
        })
      })
    })
  })

  // ============================================
  // FILTERS TESTS
  // ============================================

  describe('getAllWithFilters', () => {
    const mockTodos = [
      createMockTodo({
        id: 'todo-1',
        title: 'Work task',
        completed: false,
        priority: 'HIGH',
        categoryId: 'work-cat',
      }),
      createMockTodo({
        id: 'todo-2',
        title: 'Personal task',
        completed: true,
        priority: 'LOW',
        categoryId: 'personal-cat',
      }),
      createMockTodo({
        id: 'todo-3',
        title: 'Urgent work',
        completed: false,
        priority: 'URGENT',
        categoryId: 'work-cat',
        deadline: new Date(Date.now() - 86400000), // Yesterday (overdue)
      }),
    ]

    beforeEach(() => {
      mockPrisma.todo.findMany.mockResolvedValue(mockTodos)
      mockPrisma.todo.count.mockResolvedValue(mockTodos.length)
    })

    describe('filter by status', () => {
      it('should filter completed todos', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ status: 'completed' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              completed: true,
            }),
          })
        )
      })

      it('should filter active todos', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ status: 'active' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              completed: false,
            }),
          })
        )
      })

      it('should not filter by status when not specified', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({})

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              completed: expect.anything(),
            }),
          })
        )
      })
    })

    describe('filter by categoryId', () => {
      it('should filter by category', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ categoryId: 'work-cat' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              categoryId: 'work-cat',
            }),
          })
        )
      })
    })

    describe('filter by priority', () => {
      it('should filter by priority', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ priority: 'HIGH' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              priority: 'HIGH',
            }),
          })
        )
      })

      it('should filter by URGENT priority', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ priority: 'URGENT' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              priority: 'URGENT',
            }),
          })
        )
      })
    })

    describe('filter by search', () => {
      it('should search in title and description', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ search: 'work' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { title: { contains: 'work', mode: 'insensitive' } },
                { description: { contains: 'work', mode: 'insensitive' } },
              ],
            }),
          })
        )
      })
    })

    describe('filter by overdue', () => {
      it('should filter overdue todos', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ overdue: 'true' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              completed: false,
              deadline: { lt: expect.any(Date) },
            }),
          })
        )
      })

      it('should not filter overdue when not specified', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({})

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              deadline: expect.anything(),
            }),
          })
        )
      })
    })

    describe('combined filters', () => {
      it('should apply multiple filters together', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({
          status: 'active',
          categoryId: 'work-cat',
          priority: 'HIGH',
        })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              completed: false,
              categoryId: 'work-cat',
              priority: 'HIGH',
            }),
          })
        )
      })
    })

    describe('pagination', () => {
      it('should use default pagination', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({})

        const result = await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 5,
          })
        )
        expect(result.data!.meta).toEqual({
          total: 3,
          page: 1,
          limit: 5,
          totalPages: 1,
        })
      })

      it('should respect page and limit parameters', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ page: '2', limit: '10' })
        mockPrisma.todo.count.mockResolvedValue(25)

        const result = await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          })
        )
        expect(result.data!.meta).toEqual({
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3,
        })
      })

      it('should cap limit at 100', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ limit: '500' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          })
        )
      })

      it('should handle page < 1 as page 1', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({ page: '-1' })

        await TodoResource.getAllWithFilters(event)

        expect(mockPrisma.todo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
          })
        )
      })
    })

    describe('response format', () => {
      it('should return success with data and meta', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({})

        const result = await TodoResource.getAllWithFilters(event)

        expect(result.success).toBe(true)
        expect(result.data).toHaveProperty('data')
        expect(result.data).toHaveProperty('meta')
        expect(Array.isArray(result.data!.data)).toBe(true)
      })

      it('should serialize todos correctly', async () => {
        const event = createMockEvent()
        mockGetQuery.mockReturnValue({})
        mockPrisma.todo.findMany.mockResolvedValue([createMockTodo()])
        mockPrisma.todo.count.mockResolvedValue(1)

        const result = await TodoResource.getAllWithFilters(event)

        expect(result.data!.data[0]).toHaveProperty('id')
        expect(result.data!.data[0]).toHaveProperty('title')
        expect(result.data!.data[0]).toHaveProperty('category')
        // Dates should be serialized as ISO strings
        expect(typeof result.data!.data[0].createdAt).toBe('string')
      })
    })
  })
})
