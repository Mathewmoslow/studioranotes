import { Course, Task } from '@studioranotes/types'

export interface CanvasConfig {
  apiUrl: string
  apiToken: string
  userId?: string
}

export interface CanvasAssignment {
  id: number
  name: string
  description?: string
  due_at?: string
  course_id: number
  points_possible?: number
  submission_types?: string[]
  has_submitted_submissions?: boolean
}

export interface CanvasCourse {
  id: number
  name: string
  course_code: string
  enrollment_term_id?: number
  workflow_state: string
}

export class CanvasClient {
  private config: CanvasConfig

  constructor(config: CanvasConfig) {
    this.config = config
  }

  private async fetchCanvas(endpoint: string, options?: RequestInit) {
    const url = `${this.config.apiUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Courses
  async getCourses(): Promise<CanvasCourse[]> {
    return this.fetchCanvas('/courses?enrollment_state=active&per_page=100')
  }

  async getCourse(courseId: number): Promise<CanvasCourse> {
    return this.fetchCanvas(`/courses/${courseId}`)
  }

  // Assignments
  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    return this.fetchCanvas(`/courses/${courseId}/assignments?per_page=100`)
  }

  async getUpcomingAssignments(): Promise<CanvasAssignment[]> {
    const courses = await this.getCourses()
    const allAssignments: CanvasAssignment[] = []

    for (const course of courses) {
      try {
        const assignments = await this.getAssignments(course.id)
        allAssignments.push(...assignments)
      } catch (error) {
        console.error(`Failed to fetch assignments for course ${course.id}:`, error)
      }
    }

    // Filter for upcoming assignments
    const now = new Date()
    return allAssignments.filter(assignment => {
      if (!assignment.due_at) return false
      const dueDate = new Date(assignment.due_at)
      return dueDate > now
    }).sort((a, b) => {
      const dateA = new Date(a.due_at!)
      const dateB = new Date(b.due_at!)
      return dateA.getTime() - dateB.getTime()
    })
  }

  // Convert Canvas data to our format
  convertCourseToLocal(canvasCourse: CanvasCourse): Partial<Course> {
    return {
      canvasId: canvasCourse.id.toString(),
      code: canvasCourse.course_code,
      name: canvasCourse.name,
      canvasSyncEnabled: true,
      lastCanvasSync: new Date(),
    }
  }

  convertAssignmentToTask(assignment: CanvasAssignment, courseId: string): Partial<Task> {
    const dueDate = assignment.due_at ? new Date(assignment.due_at) : undefined

    return {
      canvasId: assignment.id.toString(),
      title: assignment.name,
      description: assignment.description,
      courseId,
      dueDate: dueDate || new Date(),
      type: this.determineTaskType(assignment),
      estimatedHours: this.estimateHours(assignment),
      priority: this.determinePriority(dueDate),
      status: 'not-started',
    }
  }

  private determineTaskType(assignment: CanvasAssignment): Task['type'] {
    const name = assignment.name.toLowerCase()
    const types = assignment.submission_types || []

    if (name.includes('exam') || name.includes('test')) return 'exam'
    if (name.includes('quiz')) return 'quiz'
    if (name.includes('lab')) return 'lab'
    if (name.includes('project')) return 'project'
    if (name.includes('paper') || types.includes('online_text_entry')) return 'paper'
    if (name.includes('discussion') || types.includes('discussion_topic')) return 'discussion'
    if (name.includes('presentation')) return 'presentation'
    if (name.includes('reading')) return 'reading'

    return 'assignment'
  }

  private estimateHours(assignment: CanvasAssignment): number {
    const points = assignment.points_possible || 10
    const name = assignment.name.toLowerCase()

    // Estimate based on points and type
    if (name.includes('exam') || name.includes('test')) return Math.max(4, points / 10)
    if (name.includes('project')) return Math.max(8, points / 5)
    if (name.includes('paper')) return Math.max(6, points / 8)
    if (name.includes('quiz')) return Math.max(1, points / 20)
    if (name.includes('reading')) return 2
    if (name.includes('discussion')) return 1

    // Default estimate based on points
    return Math.max(2, Math.min(10, points / 10))
  }

  private determinePriority(dueDate?: Date): Task['priority'] {
    if (!dueDate) return 'medium'

    const now = new Date()
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue <= 1) return 'critical'
    if (daysUntilDue <= 3) return 'high'
    if (daysUntilDue <= 7) return 'medium'

    return 'low'
  }

  // Sync all Canvas data
  async syncAll() {
    try {
      const courses = await this.getCourses()
      const assignments = await this.getUpcomingAssignments()

      return {
        courses: courses.map(c => this.convertCourseToLocal(c)),
        tasks: assignments.map(a => {
          const course = courses.find(c => c.id === a.course_id)
          const courseCode = course?.course_code || 'UNKNOWN'
          return this.convertAssignmentToTask(a, courseCode)
        }),
      }
    } catch (error) {
      console.error('Canvas sync failed:', error)
      throw error
    }
  }
}