import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/sync - Sync all data from client store to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image
        }
      })
    }

    const data = await request.json()

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Sync preferences
      if (data.preferences) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            preferences: data.preferences,
            onboardingCompleted: data.onboardingCompleted || true
          }
        })
      }

      // Sync courses
      if (data.courses && data.courses.length > 0) {
        // Delete courses not in the sync data
        const courseIds = data.courses.map((c: any) => c.id).filter(Boolean)
        await tx.course.deleteMany({
          where: {
            userId: user.id,
            id: {
              notIn: courseIds
            }
          }
        })

        // Upsert courses
        for (const course of data.courses) {
          const courseData = {
            userId: user.id,
            code: course.code,
            name: course.name,
            instructor: course.instructor,
            description: course.description,
            color: course.color || '#667eea',
            creditHours: course.creditHours,
            semester: course.semester,
            year: course.year,
            schedule: course.schedule,
            progress: course.progress || 0,
            completedModules: course.completedModules || [],
            canvasId: course.canvasId,
            canvasCourseCode: course.canvasCourseCode,
            canvasSyncEnabled: course.canvasSyncEnabled || false,
            lastCanvasSync: course.lastCanvasSync ? new Date(course.lastCanvasSync) : undefined
          }

          if (course.id) {
            // Update existing course
            await tx.course.update({
              where: { id: course.id },
              data: courseData
            })
          } else {
            // Create new course
            const newCourse = await tx.course.create({
              data: courseData
            })
            // Map the local ID to the database ID for tasks
            course.dbId = newCourse.id
          }
        }
      }

      // Sync tasks
      if (data.tasks && data.tasks.length > 0) {
        // Delete tasks not in the sync data
        const taskIds = data.tasks.map((t: any) => t.id).filter(Boolean)
        await tx.task.deleteMany({
          where: {
            userId: user.id,
            id: {
              notIn: taskIds
            }
          }
        })

        // Upsert tasks
        for (const task of data.tasks) {
          // Find the course ID (might have been mapped from local to DB)
          const course = data.courses?.find((c: any) =>
            c.id === task.courseId || c.localId === task.courseId
          )
          const courseId = course?.dbId || course?.id || task.courseId

          const taskData = {
            userId: user.id,
            courseId,
            title: task.title,
            description: task.description,
            type: task.type || 'ASSIGNMENT',
            dueDate: new Date(task.dueDate),
            startDate: task.startDate ? new Date(task.startDate) : undefined,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
            estimatedHours: task.estimatedHours || 2,
            actualHours: task.actualHours,
            complexity: task.complexity || 3,
            priority: task.priority || 'MEDIUM',
            isHardDeadline: task.isHardDeadline ?? true,
            canSplit: task.canSplit ?? true,
            preferredTimes: task.preferredTimes || [],
            bufferDays: task.bufferDays,
            status: task.status || 'NOT_STARTED',
            progress: task.progress || 0,
            canvasId: task.canvasId,
            canvasSubmissionId: task.canvasSubmissionId,
            grade: task.grade,
            feedback: task.feedback,
            autoGenerateNotes: task.autoGenerateNotes || false,
            noteGenerationPrompts: task.noteGenerationPrompts || [],
            studyMaterialsGenerated: task.studyMaterialsGenerated || false
          }

          if (task.id && !task.localId) {
            // Update existing task
            await tx.task.update({
              where: { id: task.id },
              data: taskData
            })
          } else {
            // Create new task
            await tx.task.create({
              data: taskData
            })
          }
        }
      }

      // Sync study blocks
      if (data.studyBlocks && data.studyBlocks.length > 0) {
        // Delete old study blocks
        await tx.studyBlock.deleteMany({
          where: {
            userId: user.id,
            startTime: {
              lt: new Date()
            }
          }
        })

        // Create new study blocks
        for (const block of data.studyBlocks) {
          const course = data.courses?.find((c: any) =>
            c.id === block.courseId || c.localId === block.courseId
          )
          const courseId = course?.dbId || course?.id || block.courseId

          await tx.studyBlock.create({
            data: {
              userId: user.id,
              taskId: block.taskId,
              courseId,
              startTime: new Date(block.startTime),
              endTime: new Date(block.endTime),
              duration: block.duration ||
                Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000),
              type: block.type || 'READING',
              title: block.title || 'Study Session',
              description: block.description,
              energyLevel: block.energyLevel || 'MEDIUM',
              canReschedule: block.canReschedule ?? true,
              locked: block.locked || false,
              status: block.status || 'SCHEDULED',
              completionRate: block.completionRate || 0,
              notesCreated: block.notesCreated || [],
              suggestedContent: block.suggestedContent
            }
          })
        }
      }

      // Sync notes
      if (data.notes && data.notes.length > 0) {
        for (const note of data.notes) {
          const course = data.courses?.find((c: any) =>
            c.id === note.courseId || c.localId === note.courseId
          )
          const courseId = course?.dbId || course?.id || note.courseId

          // Check if note with this slug exists
          const existingNote = await tx.note.findUnique({
            where: { slug: note.slug }
          })

          const noteData = {
            userId: user.id,
            courseId,
            moduleId: note.moduleId,
            title: note.title,
            content: note.content,
            markdown: note.markdown || note.content,
            html: note.html,
            summary: note.summary,
            tags: note.tags || [],
            category: note.category || 'OTHER',
            type: note.type || 'COMPREHENSIVE',
            aiGenerated: note.aiGenerated || false,
            generationPrompt: note.generationPrompt,
            style: note.style || 'COMPREHENSIVE',
            starred: note.starred || false,
            archived: note.archived || false,
            reviewCount: note.reviewCount || 0,
            comprehensionScore: note.comprehensionScore,
            relatedNotes: note.relatedNotes || [],
            lastAccessedAt: note.lastAccessedAt ? new Date(note.lastAccessedAt) : undefined
          }

          if (existingNote) {
            await tx.note.update({
              where: { id: existingNote.id },
              data: noteData
            })
          } else {
            // Generate unique slug if needed
            let slug = note.slug || note.title.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')

            let counter = 1
            while (await tx.note.findUnique({ where: { slug } })) {
              slug = `${note.slug || note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${counter}`
              counter++
            }

            await tx.note.create({
              data: {
                ...noteData,
                slug
              }
            })
          }
        }
      }

      return {
        success: true,
        coursesCount: data.courses?.length || 0,
        tasksCount: data.tasks?.length || 0,
        notesCount: data.notes?.length || 0,
        blocksCount: data.studyBlocks?.length || 0
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error syncing data:', error)
    return NextResponse.json({ error: 'Sync failed', details: error }, { status: 500 })
  }
}

// GET /api/sync - Load all data from database to client store
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        courses: {
          include: {
            modules: true
          }
        },
        tasks: {
          include: {
            studyBlocks: true
          }
        },
        notes: {
          orderBy: {
            updatedAt: 'desc'
          }
        },
        studyBlocks: {
          where: {
            startTime: {
              gte: new Date()
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({
        user: null,
        courses: [],
        tasks: [],
        notes: [],
        studyBlocks: [],
        preferences: null
      })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        onboardingCompleted: user.onboardingCompleted
      },
      courses: user.courses,
      tasks: user.tasks,
      notes: user.notes,
      studyBlocks: user.studyBlocks,
      preferences: user.preferences
    })
  } catch (error) {
    console.error('Error loading data:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}