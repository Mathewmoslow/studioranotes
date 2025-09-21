import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tasks - Get all tasks for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const status = searchParams.get('status')

    const where: any = { userId: user.id }
    if (courseId) where.courseId = courseId
    if (status) where.status = status

    const tasks = await prisma.task.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            color: true
          }
        },
        studyBlocks: {
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = await request.json()

    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: {
        id: data.courseId,
        userId: user.id
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        type: data.type || 'ASSIGNMENT',
        dueDate: new Date(data.dueDate),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        estimatedHours: data.estimatedHours || 2,
        complexity: data.complexity || 3,
        priority: data.priority || 'MEDIUM',
        isHardDeadline: data.isHardDeadline ?? true,
        canSplit: data.canSplit ?? true,
        preferredTimes: data.preferredTimes || [],
        bufferDays: data.bufferDays,
        status: data.status || 'NOT_STARTED',
        canvasId: data.canvasId,
        autoGenerateNotes: data.autoGenerateNotes || false
      },
      include: {
        course: true,
        studyBlocks: true
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/tasks - Update a task
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id, ...data } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updateData: any = {}

    // Only update provided fields
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.type !== undefined) updateData.type = data.type
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate)
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours
    if (data.complexity !== undefined) updateData.complexity = data.complexity
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.status !== undefined) updateData.status = data.status
    if (data.progress !== undefined) updateData.progress = data.progress
    if (data.grade !== undefined) updateData.grade = data.grade
    if (data.feedback !== undefined) updateData.feedback = data.feedback

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        studyBlocks: true
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}