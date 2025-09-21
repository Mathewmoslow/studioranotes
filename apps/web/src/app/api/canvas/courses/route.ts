import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Canvas credentials from request headers or stored tokens
    const canvasUrl = request.headers.get('x-canvas-url')
    const canvasToken = request.headers.get('x-canvas-token')

    if (!canvasUrl || !canvasToken) {
      return NextResponse.json(
        { error: 'Canvas credentials not provided' },
        { status: 400 }
      )
    }

    // Fetch courses from Canvas
    const coursesUrl = `${canvasUrl}/api/v1/courses?enrollment_state=active&include[]=term&include[]=teachers`
    const response = await fetch(coursesUrl, {
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch courses from Canvas' },
        { status: 400 }
      )
    }

    const canvasCourses = await response.json()

    // Transform Canvas courses to our format
    const courses = canvasCourses.map((course: any) => ({
      id: course.id,
      name: course.name,
      code: course.course_code,
      term: course.term?.name || 'Current Term',
      startDate: course.start_at,
      endDate: course.end_at,
      instructor: course.teachers?.[0]?.display_name || 'TBA',
      canvasId: course.id,
      enrollmentType: course.enrollments?.[0]?.type || 'student'
    }))

    return NextResponse.json({ courses })

  } catch (error) {
    console.error('Canvas courses fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

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
    const { courses, canvasUrl, canvasToken } = body

    // Import courses and fetch additional details
    const importedCourses = []

    for (const course of courses) {
      try {
        // Fetch assignments for each course
        const assignmentsUrl = `${canvasUrl}/api/v1/courses/${course.canvasId}/assignments`
        const assignmentsResponse = await fetch(assignmentsUrl, {
          headers: {
            'Authorization': `Bearer ${canvasToken}`,
            'Accept': 'application/json'
          }
        })

        let assignments = []
        if (assignmentsResponse.ok) {
          const canvasAssignments = await assignmentsResponse.json()
          assignments = canvasAssignments.map((assignment: any) => ({
            id: assignment.id,
            name: assignment.name,
            dueDate: assignment.due_at,
            points: assignment.points_possible,
            description: assignment.description,
            submissionTypes: assignment.submission_types
          }))
        }

        // Fetch syllabus if available
        const syllabusUrl = `${canvasUrl}/api/v1/courses/${course.canvasId}?include[]=syllabus_body`
        const syllabusResponse = await fetch(syllabusUrl, {
          headers: {
            'Authorization': `Bearer ${canvasToken}`,
            'Accept': 'application/json'
          }
        })

        let syllabus = null
        if (syllabusResponse.ok) {
          const courseDetails = await syllabusResponse.json()
          syllabus = courseDetails.syllabus_body
        }

        // Fetch calendar events for the course
        const eventsUrl = `${canvasUrl}/api/v1/calendar_events?context_codes[]=course_${course.canvasId}&per_page=100`
        const eventsResponse = await fetch(eventsUrl, {
          headers: {
            'Authorization': `Bearer ${canvasToken}`,
            'Accept': 'application/json'
          }
        })

        let calendarEvents = []
        if (eventsResponse.ok) {
          const canvasEvents = await eventsResponse.json()
          calendarEvents = canvasEvents.map((event: any) => ({
            id: event.id,
            title: event.title,
            startAt: event.start_at,
            endAt: event.end_at,
            description: event.description,
            location: event.location_name,
            type: event.type,
            allDay: event.all_day
          }))
        }

        // Fetch course files to look for schedule documents
        const filesUrl = `${canvasUrl}/api/v1/courses/${course.canvasId}/files?search_term=schedule&search_term=calendar&search_term=syllabus`
        const filesResponse = await fetch(filesUrl, {
          headers: {
            'Authorization': `Bearer ${canvasToken}`,
            'Accept': 'application/json'
          }
        })

        let courseFiles = []
        if (filesResponse.ok) {
          const canvasFiles = await filesResponse.json()
          courseFiles = canvasFiles.map((file: any) => ({
            id: file.id,
            filename: file.filename,
            url: file.url,
            size: file.size,
            contentType: file.content_type,
            createdAt: file.created_at
          }))
        }

        // Fetch course modules/pages that might contain schedule info
        const modulesUrl = `${canvasUrl}/api/v1/courses/${course.canvasId}/modules?include[]=items`
        const modulesResponse = await fetch(modulesUrl, {
          headers: {
            'Authorization': `Bearer ${canvasToken}`,
            'Accept': 'application/json'
          }
        })

        let modules = []
        if (modulesResponse.ok) {
          const canvasModules = await modulesResponse.json()
          modules = canvasModules.map((module: any) => ({
            id: module.id,
            name: module.name,
            position: module.position,
            items: module.items?.map((item: any) => ({
              title: item.title,
              type: item.type,
              contentId: item.content_id
            }))
          }))
        }

        importedCourses.push({
          ...course,
          assignments,
          syllabus,
          calendarEvents,
          courseFiles,
          modules,
          imported: true
        })

      } catch (error) {
        console.error(`Failed to import details for course ${course.id}:`, error)
        importedCourses.push({
          ...course,
          assignments: [],
          syllabus: null,
          imported: false,
          error: 'Failed to import some course details'
        })
      }
    }

    // Store imported courses in database
    // For now, return the imported data

    return NextResponse.json({
      success: true,
      importedCourses,
      message: `Successfully imported ${importedCourses.filter(c => c.imported).length} courses`
    })

  } catch (error) {
    console.error('Canvas import error:', error)
    return NextResponse.json(
      { error: 'Failed to import courses' },
      { status: 500 }
    )
  }
}