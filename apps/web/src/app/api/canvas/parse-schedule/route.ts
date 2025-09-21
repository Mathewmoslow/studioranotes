import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { syllabus, calendarEvents, courseFiles, courseName } = body

    if (!openai) {
      // Return structured data without AI parsing if OpenAI is not configured
      return NextResponse.json({
        success: true,
        schedule: {
          lectures: [],
          assignments: calendarEvents?.filter((e: any) => e.type === 'assignment') || [],
          exams: calendarEvents?.filter((e: any) =>
            e.title?.toLowerCase().includes('exam') ||
            e.title?.toLowerCase().includes('test') ||
            e.title?.toLowerCase().includes('quiz')
          ) || [],
          rawSyllabus: syllabus,
          message: 'OpenAI API key not configured. Returning raw data.'
        }
      })
    }

    // Prepare content for AI parsing
    let contentToParse = ''

    if (syllabus) {
      // Strip HTML tags from syllabus
      const syllabusText = syllabus.replace(/<[^>]*>/g, ' ').substring(0, 8000)
      contentToParse += `SYLLABUS CONTENT:\n${syllabusText}\n\n`
    }

    if (calendarEvents && calendarEvents.length > 0) {
      contentToParse += `CALENDAR EVENTS:\n`
      calendarEvents.forEach((event: any) => {
        contentToParse += `- ${event.title} (${event.startAt})\n`
        if (event.description) {
          contentToParse += `  Description: ${event.description}\n`
        }
      })
      contentToParse += '\n'
    }

    if (!contentToParse) {
      return NextResponse.json({
        success: false,
        error: 'No content to parse'
      })
    }

    // Use AI to extract structured schedule data
    const prompt = `Extract a structured course schedule from the following course materials for ${courseName}.

${contentToParse}

Please extract and return a JSON object with:
1. lectures: Array of recurring lecture times with days of week and times
2. assignments: Array with title, dueDate, description, points
3. exams: Array with title, date, time, location, topics
4. importantDates: Array of other important dates like holidays, breaks, etc.
5. officeHours: Instructor office hours if mentioned
6. courseSchedule: Week-by-week topics if available

Return ONLY valid JSON, no markdown formatting or explanation.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured academic schedule data from course materials. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: "json_object" }
    })

    const extractedSchedule = JSON.parse(completion.choices[0]?.message?.content || '{}')

    // Also look for schedule-related files
    const scheduleFiles = courseFiles?.filter((file: any) =>
      file.filename?.toLowerCase().includes('schedule') ||
      file.filename?.toLowerCase().includes('calendar') ||
      file.filename?.toLowerCase().includes('syllabus')
    ) || []

    return NextResponse.json({
      success: true,
      schedule: {
        ...extractedSchedule,
        scheduleFiles,
        rawCalendarEvents: calendarEvents,
        parseMethod: 'ai'
      }
    })

  } catch (error) {
    console.error('Schedule parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse schedule' },
      { status: 500 }
    )
  }
}