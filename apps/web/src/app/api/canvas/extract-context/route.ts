import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      syllabus,
      announcements,
      discussions,
      moduleDescriptions,
      assignmentDescriptions,
      courseName,
      existingAssignments // Already imported from Canvas
    } = body

    if (!openai) {
      return NextResponse.json({
        error: 'OpenAI not configured',
        extractedTasks: []
      })
    }

    // Build context for AI
    let context = `Course: ${courseName}\n\n`

    // List existing assignments so AI knows what NOT to duplicate
    if (existingAssignments?.length > 0) {
      context += `ALREADY IMPORTED ASSIGNMENTS (DO NOT DUPLICATE THESE):\n`
      existingAssignments.forEach((a: any) => {
        context += `- ${a.name} (Due: ${a.dueDate})\n`
      })
      context += '\n'
    }

    // Add all unstructured text sources
    if (syllabus) {
      context += `SYLLABUS:\n${syllabus.substring(0, 10000)}\n\n`
    }

    if (announcements?.length > 0) {
      context += `RECENT ANNOUNCEMENTS:\n`
      announcements.slice(0, 10).forEach((announcement: any) => {
        context += `[${announcement.date}] ${announcement.title}\n${announcement.message}\n\n`
      })
    }

    if (discussions?.length > 0) {
      context += `PROFESSOR DISCUSSION POSTS:\n`
      discussions.slice(0, 10).forEach((post: any) => {
        context += `[${post.date}] ${post.message}\n\n`
      })
    }

    if (moduleDescriptions?.length > 0) {
      context += `MODULE DESCRIPTIONS:\n`
      moduleDescriptions.forEach((module: any) => {
        context += `${module.name}: ${module.description}\n`
      })
    }

    if (assignmentDescriptions?.length > 0) {
      context += `ASSIGNMENT DETAILED DESCRIPTIONS:\n`
      assignmentDescriptions.forEach((desc: any) => {
        context += `[${desc.name}]: ${desc.description}\n\n`
      })
    }

    const prompt = `You are an expert at finding hidden assignments and deadlines that professors mention informally but don't create formal Canvas assignments for.

${context}

Extract ANY tasks, deadlines, or requirements mentioned that are NOT in the already imported assignments list. Look for:

1. Recurring tasks mentioned in syllabus (e.g., "Weekly reflections due Fridays", "Lab notebooks checked monthly")
2. Assignments mentioned only in announcements (e.g., "Don't forget to submit your reading response by Tuesday")
3. Hidden requirements in assignment descriptions (e.g., "Also submit a peer review" mentioned in an essay assignment)
4. Informal deadlines (e.g., "I expect you to have read Chapter 5 by next week")
5. Participation requirements (e.g., "Post to discussion board twice weekly")
6. Pre-work or prep mentioned casually (e.g., "Make sure to review the slides before class")

Return a JSON object with:
{
  "extractedTasks": [
    {
      "title": "Clear task name",
      "type": "assignment|reading|discussion|participation|review|preparation",
      "dueDate": "ISO date or null if recurring",
      "recurring": true/false,
      "recurringPattern": "weekly|biweekly|monthly|null",
      "recurringDay": "Monday|Tuesday|...|null",
      "description": "What needs to be done",
      "source": "Where this was found (syllabus/announcement/etc)",
      "confidence": "high|medium|low",
      "estimatedHours": number
    }
  ],
  "hiddenPatterns": [
    {
      "pattern": "Description of recurring requirement",
      "frequency": "How often",
      "importance": "high|medium|low"
    }
  ],
  "warnings": [
    "Any important notes about workload or hidden expectations"
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at finding hidden academic requirements and informal deadlines that professors mention but don\'t formalize in Canvas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    })

    const extracted = JSON.parse(completion.choices[0]?.message?.content || '{}')

    // Process recurring tasks into individual instances
    const processedTasks = []
    const today = new Date()

    for (const task of extracted.extractedTasks || []) {
      if (task.recurring && task.recurringPattern) {
        // Generate instances for the next 12 weeks
        const instances = generateRecurringInstances(task, today, 12)
        processedTasks.push(...instances)
      } else if (task.dueDate) {
        processedTasks.push(task)
      }
    }

    return NextResponse.json({
      success: true,
      extracted: {
        tasks: processedTasks,
        patterns: extracted.hiddenPatterns || [],
        warnings: extracted.warnings || []
      },
      summary: `Found ${processedTasks.length} hidden tasks and ${extracted.hiddenPatterns?.length || 0} recurring patterns`
    })

  } catch (error) {
    console.error('Context extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract context' },
      { status: 500 }
    )
  }
}

function generateRecurringInstances(task: any, startDate: Date, weeks: number) {
  const instances = []
  const dayMap: { [key: string]: number } = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
    'Friday': 5, 'Saturday': 6, 'Sunday': 0
  }

  for (let week = 0; week < weeks; week++) {
    const dueDate = new Date(startDate)

    if (task.recurringPattern === 'weekly') {
      dueDate.setDate(startDate.getDate() + (week * 7))

      if (task.recurringDay) {
        const targetDay = dayMap[task.recurringDay]
        const currentDay = dueDate.getDay()
        const daysToAdd = (targetDay - currentDay + 7) % 7
        dueDate.setDate(dueDate.getDate() + daysToAdd)
      }
    } else if (task.recurringPattern === 'biweekly') {
      dueDate.setDate(startDate.getDate() + (week * 14))
    } else if (task.recurringPattern === 'monthly') {
      dueDate.setMonth(startDate.getMonth() + week)
    }

    instances.push({
      ...task,
      title: `${task.title} (Week ${week + 1})`,
      dueDate: dueDate.toISOString(),
      recurring: false,
      isGenerated: true,
      originalPattern: task.recurringPattern
    })
  }

  return instances
}