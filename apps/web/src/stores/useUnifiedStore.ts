import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import {
  Course,
  Task,
  CalendarEvent,
  Note,
  StudyBlock,
  Module,
  UserPreferences,
  StudyPattern
} from '@studioranotes/types'

interface UnifiedState {
  // User & Preferences
  user: {
    id: string | null
    email: string | null
    name: string | null
    onboardingComplete: boolean
    preferences: UserPreferences | null
  }

  // Courses (from StudentLife)
  courses: Course[]
  selectedCourseId: string | null

  // Tasks & Assignments (from StudentLife)
  tasks: Task[]

  // Calendar & Events (from StudentLife)
  events: CalendarEvent[]
  studyBlocks: StudyBlock[]

  // Notes (from NotesAI)
  notes: Note[]
  currentNote: Note | null
  generatingNote: boolean
  noteGenerationProgress: number

  // Modules (from NotesAI)
  modules: Module[]
  selectedModuleId: string | null

  // Study Analytics
  studyPatterns: StudyPattern[]
  weeklyStudyHours: number
  currentStreak: number

  // UI State
  sidebarOpen: boolean
  selectedView: 'dashboard' | 'schedule' | 'notes' | 'courses' | 'analytics'
  selectedDate: Date
  calendarView: 'week' | 'month' | 'day'

  // Actions - User
  setUser: (user: Partial<UnifiedState['user']>) => void
  setPreferences: (preferences: UserPreferences) => void
  completeOnboarding: () => void

  // Actions - Courses
  addCourse: (course: Course) => void
  updateCourse: (id: string, updates: Partial<Course>) => void
  deleteCourse: (id: string) => void
  selectCourse: (id: string | null) => void

  // Actions - Tasks
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  completeTask: (id: string) => void

  // Actions - Events & Study Blocks
  addEvent: (event: CalendarEvent) => void
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  addStudyBlock: (block: StudyBlock) => void
  updateStudyBlock: (id: string, updates: Partial<StudyBlock>) => void
  deleteStudyBlock: (id: string) => void

  // Actions - Notes
  setNotes: (notes: Note[]) => void
  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  setCurrentNote: (note: Note | null) => void
  setGeneratingNote: (generating: boolean) => void
  setNoteGenerationProgress: (progress: number) => void

  // Actions - Modules
  addModule: (module: Module) => void
  updateModule: (id: string, updates: Partial<Module>) => void
  deleteModule: (id: string) => void
  selectModule: (id: string | null) => void

  // Actions - UI
  setSidebarOpen: (open: boolean) => void
  setSelectedView: (view: UnifiedState['selectedView']) => void
  setSelectedDate: (date: Date) => void
  setCalendarView: (view: UnifiedState['calendarView']) => void

  // Actions - Bulk Operations
  importCanvasData: (courses: Course[], tasks: Task[]) => void
  syncWithCanvas: () => Promise<void>
  clearAllData: () => void
}

const initialState = {
  user: {
    id: null,
    email: null,
    name: null,
    onboardingComplete: false,
    preferences: null
  },
  courses: [],
  selectedCourseId: null,
  tasks: [],
  events: [],
  studyBlocks: [],
  notes: [],
  currentNote: null,
  generatingNote: false,
  noteGenerationProgress: 0,
  modules: [],
  selectedModuleId: null,
  studyPatterns: [],
  weeklyStudyHours: 0,
  currentStreak: 0,
  sidebarOpen: true,
  selectedView: 'dashboard' as const,
  selectedDate: new Date(),
  calendarView: 'week' as const
}

export const useUnifiedStore = create<UnifiedState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // User Actions
        setUser: (user) => set((state) => ({
          user: { ...state.user, ...user }
        })),
        setPreferences: (preferences) => set((state) => ({
          user: { ...state.user, preferences }
        })),
        completeOnboarding: () => set((state) => ({
          user: { ...state.user, onboardingComplete: true }
        })),

        // Course Actions
        addCourse: (course) => set((state) => ({
          courses: [...state.courses, course]
        })),
        updateCourse: (id, updates) => set((state) => ({
          courses: state.courses.map(c => c.id === id ? { ...c, ...updates } : c)
        })),
        deleteCourse: (id) => set((state) => ({
          courses: state.courses.filter(c => c.id !== id),
          tasks: state.tasks.filter(t => t.courseId !== id),
          notes: state.notes.filter(n => n.courseId !== id)
        })),
        selectCourse: (id) => set({ selectedCourseId: id }),

        // Task Actions
        addTask: (task) => set((state) => ({
          tasks: [...state.tasks, task]
        })),
        updateTask: (id, updates) => set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
        })),
        deleteTask: (id) => set((state) => ({
          tasks: state.tasks.filter(t => t.id !== id)
        })),
        completeTask: (id) => set((state) => ({
          tasks: state.tasks.map(t =>
            t.id === id
              ? { ...t, status: 'COMPLETED' as const, completedAt: new Date() }
              : t
          )
        })),

        // Event & Study Block Actions
        addEvent: (event) => set((state) => ({
          events: [...state.events, event]
        })),
        updateEvent: (id, updates) => set((state) => ({
          events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
        })),
        deleteEvent: (id) => set((state) => ({
          events: state.events.filter(e => e.id !== id)
        })),
        addStudyBlock: (block) => set((state) => ({
          studyBlocks: [...state.studyBlocks, block]
        })),
        updateStudyBlock: (id, updates) => set((state) => ({
          studyBlocks: state.studyBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
        })),
        deleteStudyBlock: (id) => set((state) => ({
          studyBlocks: state.studyBlocks.filter(b => b.id !== id)
        })),

        // Note Actions
        setNotes: (notes) => set({ notes }),
        addNote: (note) => set((state) => ({
          notes: [...state.notes, note]
        })),
        updateNote: (id, updates) => set((state) => ({
          notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n)
        })),
        deleteNote: (id) => set((state) => ({
          notes: state.notes.filter(n => n.id !== id)
        })),
        setCurrentNote: (note) => set({ currentNote: note }),
        setGeneratingNote: (generating) => set({ generatingNote: generating }),
        setNoteGenerationProgress: (progress) => set({ noteGenerationProgress: progress }),

        // Module Actions
        addModule: (module) => set((state) => ({
          modules: [...state.modules, module]
        })),
        updateModule: (id, updates) => set((state) => ({
          modules: state.modules.map(m => m.id === id ? { ...m, ...updates } : m)
        })),
        deleteModule: (id) => set((state) => ({
          modules: state.modules.filter(m => m.id !== id)
        })),
        selectModule: (id) => set({ selectedModuleId: id }),

        // UI Actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSelectedView: (view) => set({ selectedView: view }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setCalendarView: (view) => set({ calendarView: view }),

        // Bulk Operations
        importCanvasData: (courses, tasks) => set((state) => ({
          courses: [...state.courses, ...courses],
          tasks: [...state.tasks, ...tasks]
        })),

        syncWithCanvas: async () => {
          // This will be implemented when Canvas integration is ready
          console.log('Canvas sync not yet implemented')
        },

        clearAllData: () => set(initialState)
      }),
      {
        name: 'studiora-unified-store',
        partialize: (state) => ({
          // Persist everything except UI state and generation progress
          user: state.user,
          courses: state.courses,
          tasks: state.tasks,
          events: state.events,
          studyBlocks: state.studyBlocks,
          notes: state.notes,
          modules: state.modules,
          studyPatterns: state.studyPatterns,
          weeklyStudyHours: state.weeklyStudyHours,
          currentStreak: state.currentStreak,
          selectedCourseId: state.selectedCourseId,
          selectedModuleId: state.selectedModuleId
        })
      }
    )
  )
)

// Selector hooks for common use cases
export const useCurrentCourse = () => {
  const { courses, selectedCourseId } = useUnifiedStore()
  return courses.find(c => c.id === selectedCourseId) || null
}

export const useCourseTasks = (courseId: string) => {
  const tasks = useUnifiedStore(state => state.tasks)
  return tasks.filter(t => t.courseId === courseId)
}

export const useCourseNotes = (courseId: string) => {
  const notes = useUnifiedStore(state => state.notes)
  return notes.filter(n => n.courseId === courseId)
}

export const useUpcomingTasks = (days: number = 7) => {
  const tasks = useUnifiedStore(state => state.tasks)
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + days)

  return tasks
    .filter(t => t.status !== 'COMPLETED' && new Date(t.dueDate) <= deadline)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
}

export const useTodayEvents = () => {
  const events = useUnifiedStore(state => state.events)
  const studyBlocks = useUnifiedStore(state => state.studyBlocks)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return eventDate >= today && eventDate < tomorrow
  })

  const todayBlocks = studyBlocks.filter(b => {
    const blockDate = new Date(b.startTime)
    return blockDate >= today && blockDate < tomorrow
  })

  return { events: todayEvents, studyBlocks: todayBlocks }
}