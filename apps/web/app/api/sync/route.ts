import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        courses: {
          include: {
            tasks: true,
            events: true,
            notes: true
          }
        },
        timeBlocks: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      courses: user.courses,
      tasks: user.courses.flatMap(c => c.tasks),
      events: user.courses.flatMap(c => c.events),
      notes: user.courses.flatMap(c => c.notes),
      timeBlocks: user.timeBlocks
    });
  } catch (error) {
    console.error('GET /api/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { courses, tasks, events, notes, timeBlocks } = data;

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || '',
        }
      });
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing data (to avoid duplicates)
      await tx.course.deleteMany({
        where: { userId: user.id }
      });
      await tx.timeBlock.deleteMany({
        where: { userId: user.id }
      });

      // Create courses with related data
      const coursesCreated = [];
      for (const course of courses || []) {
        const created = await tx.course.create({
          data: {
            userId: user.id,
            name: course.name,
            code: course.code,
            instructor: course.instructor,
            semester: course.semester,
            year: course.year || new Date().getFullYear(),
            color: course.color || '#667eea',
            creditHours: course.creditHours || 3,
            canvasId: course.canvasId,
            syllabus: course.syllabus,
            // Create related tasks
            tasks: {
              create: (tasks || [])
                .filter(t => t.courseId === course.id)
                .map(task => ({
                  title: task.title,
                  description: task.description,
                  type: task.type || 'assignment',
                  dueDate: new Date(task.dueDate),
                  status: task.status || 'not-started',
                  priority: task.priority || 'medium',
                  complexity: task.complexity || 3,
                  estimatedHours: task.estimatedHours || 2,
                  completedAt: task.completedAt ? new Date(task.completedAt) : null,
                  progress: task.progress || 0,
                  canvasId: task.canvasId
                }))
            },
            // Create related events
            events: {
              create: (events || [])
                .filter(e => e.courseId === course.id)
                .map(event => ({
                  title: event.title,
                  description: event.description,
                  type: event.type || 'lecture',
                  startTime: new Date(event.startTime),
                  endTime: new Date(event.endTime),
                  location: event.location,
                  isOnline: event.isOnline || false,
                  isRecurring: event.isRecurring || false,
                  recurrenceRule: event.recurrenceRule,
                  canvasId: event.canvasId
                }))
            },
            // Create related notes
            notes: {
              create: (notes || [])
                .filter(n => n.courseId === course.id)
                .map(note => ({
                  title: note.title,
                  content: note.content || '',
                  type: note.type || 'lecture',
                  topic: note.topic,
                  tags: note.tags || []
                }))
            }
          }
        });
        coursesCreated.push(created);
      }

      // Create time blocks
      const blocksCreated = [];
      for (const block of timeBlocks || []) {
        // Find the task if it exists
        let taskId = null;
        if (block.taskId) {
          const task = await tx.task.findFirst({
            where: {
              course: {
                userId: user.id
              }
            }
          });
          taskId = task?.id;
        }

        const created = await tx.timeBlock.create({
          data: {
            userId: user.id,
            taskId: taskId,
            startTime: new Date(block.startTime),
            endTime: new Date(block.endTime),
            type: block.type || 'study',
            completed: block.completed || false,
            notes: block.notes
          }
        });
        blocksCreated.push(created);
      }

      return {
        coursesCount: coursesCreated.length,
        tasksCount: await tx.task.count({
          where: {
            course: {
              userId: user.id
            }
          }
        }),
        eventsCount: await tx.event.count({
          where: {
            course: {
              userId: user.id
            }
          }
        }),
        notesCount: await tx.note.count({
          where: {
            course: {
              userId: user.id
            }
          }
        }),
        blocksCount: blocksCreated.length
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('POST /api/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync data', details: error.message },
      { status: 500 }
    );
  }
}