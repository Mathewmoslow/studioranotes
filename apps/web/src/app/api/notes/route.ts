import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/notes - Get all notes for the current user
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
    const starred = searchParams.get('starred')
    const archived = searchParams.get('archived')

    const where: any = { userId: user.id }
    if (courseId) where.courseId = courseId
    if (starred === 'true') where.starred = true
    if (archived === 'true') where.archived = true
    if (archived === 'false') where.archived = false

    const notes = await prisma.note.findMany({
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
        module: {
          select: {
            id: true,
            title: true,
            number: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notes - Create a new note
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

    // Generate unique slug
    const baseSlug = data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    let slug = baseSlug
    let counter = 1

    while (await prisma.note.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const note = await prisma.note.create({
      data: {
        userId: user.id,
        courseId: data.courseId,
        moduleId: data.moduleId,
        slug,
        title: data.title,
        content: data.content,
        markdown: data.markdown || data.content,
        html: data.html,
        summary: data.summary,
        tags: data.tags || [],
        category: data.category || 'OTHER',
        type: data.type || 'COMPREHENSIVE',
        aiGenerated: data.aiGenerated || false,
        generationPrompt: data.generationPrompt,
        style: data.style || 'COMPREHENSIVE',
        starred: data.starred || false,
        relatedNotes: data.relatedNotes || []
      },
      include: {
        course: true,
        module: true
      }
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/notes - Update a note
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
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const updateData: any = {}

    // Only update provided fields
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.markdown !== undefined) updateData.markdown = data.markdown
    if (data.html !== undefined) updateData.html = data.html
    if (data.summary !== undefined) updateData.summary = data.summary
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.category !== undefined) updateData.category = data.category
    if (data.type !== undefined) updateData.type = data.type
    if (data.starred !== undefined) updateData.starred = data.starred
    if (data.archived !== undefined) updateData.archived = data.archived
    if (data.reviewCount !== undefined) updateData.reviewCount = data.reviewCount
    if (data.comprehensionScore !== undefined) updateData.comprehensionScore = data.comprehensionScore
    if (data.relatedNotes !== undefined) updateData.relatedNotes = data.relatedNotes

    // Update lastAccessedAt if the note is being read
    if (data.accessed) {
      updateData.lastAccessedAt = new Date()
    }

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        module: true
      }
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notes - Delete a note
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
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await prisma.note.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}