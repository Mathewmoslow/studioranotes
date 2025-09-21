// Unified type definitions for StudiOra Notes

// ============= User & Auth Types =============
export interface User {
  id: string
  email: string
  name?: string
  image?: string
  subscription: 'free' | 'premium' | 'pro'
  universities: University[]
  canvasTokens: CanvasToken[]
  preferences: UserPreferences
  onboardingCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface University {
  id: string
  name: string
  domain: string
  canvasUrl?: string
}

export interface CanvasToken {
  id: string
  universityId: string
  token: string
  expiresAt?: Date
  lastSync?: Date
}

// ============= Course Types =============
export interface Course {
  id: string
  code: string // e.g., "NURS320"
  name: string
  instructor?: string
  description?: string
  color: string
  creditHours?: number

  // Schedule data
  schedule?: RecurringEvent[]
  semester?: string
  year?: number

  // NotesAI data
  notesCount?: number
  modules?: Module[]
  conceptMaps?: ConceptMap[]
  studyMaterials?: StudyMaterial[]

  // Progress tracking
  progress?: number
  completedModules?: string[]

  // Canvas integration
  canvasId?: string
  canvasCourseCode?: string
  canvasSyncEnabled?: boolean
  lastCanvasSync?: Date
}

export interface RecurringEvent {
  dayOfWeek: number // 0-6 (Sunday to Saturday)
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  type: 'lecture' | 'lab' | 'clinical' | 'tutorial' | 'seminar'
  location?: string
  room?: string
}

// ============= Task & Assignment Types =============
export interface Task {
  id: string
  title: string
  description?: string
  courseId: string
  type: TaskType

  // Timing
  dueDate: Date
  startDate?: Date
  completedAt?: Date

  // Scheduling
  estimatedHours: number
  actualHours?: number
  complexity: 1 | 2 | 3 | 4 | 5
  priority: 'critical' | 'high' | 'medium' | 'low'

  // Study blocks
  scheduledBlocks?: StudyBlock[]

  // Notes integration
  relatedNotes?: Note[]
  suggestedReadings?: string[]
  conceptsToReview?: string[]

  // Settings
  isHardDeadline?: boolean
  canSplit?: boolean
  preferredTimes?: TimePreference[]
  bufferDays?: number

  // Status
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue'
  progress?: number

  // Canvas data
  canvasId?: string
  canvasSubmissionId?: string
  grade?: number
  feedback?: string
}

export type TaskType =
  | 'assignment'
  | 'exam'
  | 'quiz'
  | 'project'
  | 'presentation'
  | 'lab'
  | 'clinical'
  | 'reading'
  | 'discussion'
  | 'paper'
  | 'other'

export type TimePreference = 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night'

// ============= Study Block Types =============
export interface StudyBlock {
  id: string
  taskId?: string
  courseId?: string

  // Timing
  startTime: Date
  endTime: Date
  duration: number // minutes

  // Type and content
  type: StudyBlockType
  title: string
  description?: string

  // Smart features
  suggestedContent?: {
    notes?: Note[]
    conceptMaps?: ConceptMap[]
    practiceQuestions?: Question[]
    resources?: Resource[]
  }

  // Energy and scheduling
  energyLevel: 'low' | 'medium' | 'high'
  canReschedule?: boolean
  locked?: boolean

  // Progress
  status: 'scheduled' | 'in-progress' | 'completed' | 'skipped' | 'rescheduled'
  completionRate?: number
  notesCreated?: string[]

  // Pomodoro/Timer data
  timerSessions?: TimerSession[]
}

export type StudyBlockType =
  | 'reading'
  | 'note-taking'
  | 'practice'
  | 'review'
  | 'writing'
  | 'research'
  | 'group-study'
  | 'break'

// ============= Note Types =============
export interface Note {
  id: string
  slug: string
  title: string
  courseId: string
  moduleId?: string

  // Content
  content: string
  markdown: string
  html?: string
  summary?: string

  // Metadata
  createdAt: Date
  updatedAt: Date
  lastAccessedAt?: Date

  // Organization
  tags?: string[]
  category?: NoteCategory
  type?: NoteType

  // AI features
  aiGenerated?: boolean
  generationPrompt?: string
  style?: NoteStyle

  // Relations
  relatedNotes?: string[]
  linkedTasks?: string[]
  conceptMapIds?: string[]

  // Study features
  starred?: boolean
  archived?: boolean
  reviewCount?: number
  comprehensionScore?: number
}

export type NoteCategory =
  | 'lecture'
  | 'textbook'
  | 'clinical'
  | 'lab'
  | 'study-guide'
  | 'summary'
  | 'concept'
  | 'other'

export type NoteType =
  | 'comprehensive'
  | 'outline'
  | 'summary'
  | 'flashcards'
  | 'concept-map'
  | 'qa'

export type NoteStyle =
  | 'comprehensive'
  | 'concise'
  | 'guided'
  | 'flexible'
  | 'exploratory'

// ============= Schedule Types =============
export interface ScheduleEvent {
  id: string
  type: EventType
  title: string

  // Timing
  startTime: Date
  endTime: Date
  allDay?: boolean

  // Relations
  courseId?: string
  taskId?: string
  blockId?: string

  // Display
  color?: string
  icon?: string

  // Status
  completed?: boolean
  attendance?: 'present' | 'absent' | 'late'

  // Recurrence
  recurring?: boolean
  recurrenceRule?: RecurrenceRule
}

export type EventType =
  | 'class'
  | 'exam'
  | 'assignment-due'
  | 'study-block'
  | 'meeting'
  | 'clinical'
  | 'lab'
  | 'other'

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval?: number
  daysOfWeek?: number[]
  endDate?: Date
  exceptions?: Date[]
}

// ============= User Preferences =============
export interface UserPreferences {
  // Study preferences
  studyHours: {
    start: string // HH:mm
    end: string // HH:mm
  }
  breakDuration: number // minutes
  sessionDuration: number // minutes
  maxDailyStudyHours: number

  // Energy levels by hour (0-23)
  energyLevels: Record<number, number> // 1-10 scale

  // Time preferences
  preferredStudyTimes: TimePreference[]
  avoidTimes?: TimeSlot[]

  // Task defaults
  defaultBufferDays: {
    assignment: number
    exam: number
    project: number
    reading: number
  }

  // Scheduling
  autoReschedule: boolean
  allowWeekendStudy: boolean
  minimumBreakBetweenSessions: number // minutes

  // Notifications
  enableNotifications: boolean
  reminderTiming: number // minutes before event

  // Display
  theme: 'light' | 'dark' | 'system'
  calendarView: 'day' | 'week' | 'month'
  firstDayOfWeek: number // 0-6

  // AI preferences
  noteGenerationStyle: NoteStyle
  aiAssistanceLevel: 'minimal' | 'moderate' | 'maximum'
}

export interface TimeSlot {
  dayOfWeek?: number
  startTime: string
  endTime: string
  reason?: string
}

// ============= Analytics Types =============
export interface StudyAnalytics {
  userId: string
  period: 'day' | 'week' | 'month' | 'semester'

  // Time metrics
  totalStudyTime: number // minutes
  averageSessionLength: number
  longestStreak: number // days
  currentStreak: number

  // Productivity
  tasksCompleted: number
  tasksOverdue: number
  completionRate: number

  // Academic
  averageGrade?: number
  gradeImprovement?: number

  // Content
  notesCreated: number
  notesReviewed: number
  conceptsMastered: number

  // Patterns
  mostProductiveTime: string
  mostProductiveDay: string
  studyPatterns: StudyPattern[]
}

export interface StudyPattern {
  time: string
  productivity: number
  frequency: number
}

// ============= Other Types =============
export interface Module {
  id: string
  courseId: string
  number: number
  title: string
  description?: string
  weekNumber?: number
  topics?: string[]
  learningObjectives?: string[]
  notes?: Note[]
  completed?: boolean
}

export interface ConceptMap {
  id: string
  courseId: string
  title: string
  nodes: ConceptNode[]
  edges: ConceptEdge[]
  createdAt: Date
  updatedAt: Date
}

export interface ConceptNode {
  id: string
  label: string
  type: string
  x: number
  y: number
  color?: string
}

export interface ConceptEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface StudyMaterial {
  id: string
  courseId: string
  title: string
  type: 'pdf' | 'video' | 'link' | 'document'
  url?: string
  content?: string
  tags?: string[]
}

export interface Question {
  id: string
  question: string
  answer: string
  options?: string[]
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
}

export interface Resource {
  id: string
  title: string
  type: 'article' | 'video' | 'website' | 'book'
  url?: string
  description?: string
}

export interface TimerSession {
  startTime: Date
  endTime: Date
  duration: number
  completed: boolean
  breaks?: number
}