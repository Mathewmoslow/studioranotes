import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, canvasId, canvasUrl, canvasToken } = await request.json()

    // Fetch latest announcements
    const announcementsUrl = `${canvasUrl}/api/v1/courses/${canvasId}/discussion_topics?only_announcements=true&per_page=20`
    const announcementsResponse = await fetch(announcementsUrl, {
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Accept': 'application/json'
      }
    })

    let announcements = []
    if (announcementsResponse.ok) {
      const canvasAnnouncements = await announcementsResponse.json()
      announcements = canvasAnnouncements.map((announcement: any) => ({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        postedAt: announcement.posted_at,
        author: announcement.user_name,
        unread: announcement.unread_count > 0
      }))
    }

    // Fetch new assignments
    const assignmentsUrl = `${canvasUrl}/api/v1/courses/${canvasId}/assignments?per_page=50`
    const assignmentsResponse = await fetch(assignmentsUrl, {
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Accept': 'application/json'
      }
    })

    let newAssignments = []
    if (assignmentsResponse.ok) {
      const canvasAssignments = await assignmentsResponse.json()

      // Get stored last sync timestamp from localStorage or database
      const lastSync = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default to 1 week ago

      newAssignments = canvasAssignments
        .filter((a: any) => new Date(a.created_at) > lastSync || new Date(a.updated_at) > lastSync)
        .map((assignment: any) => ({
          id: assignment.id,
          name: assignment.name,
          dueDate: assignment.due_at,
          points: assignment.points_possible,
          description: assignment.description,
          submissionTypes: assignment.submission_types,
          isNew: new Date(assignment.created_at) > lastSync,
          wasUpdated: new Date(assignment.updated_at) > lastSync && new Date(assignment.created_at) <= lastSync
        }))
    }

    // Fetch latest calendar events
    const eventsUrl = `${canvasUrl}/api/v1/calendar_events?context_codes[]=course_${canvasId}&start_date=${new Date().toISOString()}&per_page=50`
    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Accept': 'application/json'
      }
    })

    let upcomingEvents = []
    if (eventsResponse.ok) {
      const canvasEvents = await eventsResponse.json()
      upcomingEvents = canvasEvents.map((event: any) => ({
        id: event.id,
        title: event.title,
        startAt: event.start_at,
        endAt: event.end_at,
        description: event.description,
        type: event.type
      }))
    }

    // Detect changes and new items
    const changes = {
      newAssignments: newAssignments.filter((a: any) => a.isNew),
      updatedAssignments: newAssignments.filter((a: any) => a.wasUpdated),
      recentAnnouncements: announcements.slice(0, 5),
      upcomingEvents: upcomingEvents.slice(0, 10)
    }

    return NextResponse.json({
      success: true,
      courseId,
      lastSync: new Date().toISOString(),
      changes,
      summary: {
        newAssignmentsCount: changes.newAssignments.length,
        updatedAssignmentsCount: changes.updatedAssignments.length,
        announcementsCount: announcements.length,
        eventsCount: upcomingEvents.length
      }
    })

  } catch (error) {
    console.error('Canvas sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Canvas' },
      { status: 500 }
    )
  }
}