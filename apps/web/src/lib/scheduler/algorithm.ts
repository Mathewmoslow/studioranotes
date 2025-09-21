import { addHours, startOfDay, endOfDay, isBefore, isAfter, differenceInDays, addDays, format } from 'date-fns'

export interface EnergyPattern {
  hour: number // 0-23
  energyLevel: number // 0-100
  productivity: number // 0-100
}

export interface ScheduleTask {
  id: string
  title: string
  courseId: string
  type: 'assignment' | 'quiz' | 'exam' | 'reading' | 'study' | 'project' | 'break'
  dueDate: Date
  estimatedDuration: number // in minutes
  priority: number // 0-100
  difficulty: number // 0-100
  completed: boolean
  canSplit: boolean // Can this task be split into multiple sessions
  minimumBlockSize?: number // Minimum time in minutes if task can be split
}

export interface StudyBlock {
  id: string
  taskId: string
  taskTitle: string
  taskType: ScheduleTask['type']
  startTime: Date
  endTime: Date
  energyRequired: number // 0-100
  isOptimal: boolean // Is this during peak energy time
  confidence: number // 0-100 confidence in this scheduling
}

export interface SchedulerConfig {
  dailyStudyHours: {
    min: number
    max: number
    preferred: number
  }
  breakDuration: {
    short: number // minutes (e.g., 5-10 min)
    long: number // minutes (e.g., 15-30 min)
  }
  sessionDuration: {
    min: number // minutes (e.g., 25 min for Pomodoro)
    max: number // minutes (e.g., 90 min max focus)
    preferred: number // minutes (e.g., 50 min)
  }
  bufferTime: number // minutes between tasks
  energyThreshold: {
    high: number // 70-100
    medium: number // 40-70
    low: number // 0-40
  }
  sleepSchedule: {
    bedtime: number // hour (e.g., 23 for 11 PM)
    wakeTime: number // hour (e.g., 7 for 7 AM)
  }
}

export class DynamicScheduler {
  private config: SchedulerConfig
  private energyPattern: EnergyPattern[]

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      dailyStudyHours: {
        min: 2,
        max: 8,
        preferred: 4,
        ...config?.dailyStudyHours
      },
      breakDuration: {
        short: 5,
        long: 20,
        ...config?.breakDuration
      },
      sessionDuration: {
        min: 25,
        max: 90,
        preferred: 50,
        ...config?.sessionDuration
      },
      bufferTime: 10,
      energyThreshold: {
        high: 70,
        medium: 40,
        low: 20,
        ...config?.energyThreshold
      },
      sleepSchedule: {
        bedtime: 23,
        wakeTime: 7,
        ...config?.sleepSchedule
      },
      ...config
    }

    // Initialize default energy pattern (can be personalized later)
    this.energyPattern = this.generateDefaultEnergyPattern()
  }

  private generateDefaultEnergyPattern(): EnergyPattern[] {
    const pattern: EnergyPattern[] = []

    // Based on typical circadian rhythms and StudentLife research
    const energyLevels = {
      0: 10, 1: 5, 2: 5, 3: 5, 4: 5, 5: 10, 6: 20,
      7: 40, 8: 60, 9: 80, 10: 90, 11: 85, 12: 70,
      13: 60, 14: 65, 15: 75, 16: 80, 17: 75, 18: 65,
      19: 70, 20: 65, 21: 50, 22: 30, 23: 15
    }

    for (let hour = 0; hour < 24; hour++) {
      pattern.push({
        hour,
        energyLevel: energyLevels[hour as keyof typeof energyLevels],
        productivity: energyLevels[hour as keyof typeof energyLevels] * 0.9 // Productivity slightly lower than energy
      })
    }

    return pattern
  }

  public updateEnergyPattern(pattern: Partial<EnergyPattern>[]): void {
    pattern.forEach(update => {
      if (update.hour !== undefined) {
        const existing = this.energyPattern.find(p => p.hour === update.hour)
        if (existing) {
          Object.assign(existing, update)
        }
      }
    })
  }

  private getEnergyAtTime(time: Date): EnergyPattern {
    const hour = time.getHours()
    return this.energyPattern.find(p => p.hour === hour) || this.energyPattern[0]
  }

  private calculateTaskPriority(task: ScheduleTask, currentDate: Date): number {
    const daysUntilDue = differenceInDays(task.dueDate, currentDate)

    // Urgency factor (increases as deadline approaches)
    let urgencyScore = 100
    if (daysUntilDue > 14) urgencyScore = 20
    else if (daysUntilDue > 7) urgencyScore = 40
    else if (daysUntilDue > 3) urgencyScore = 60
    else if (daysUntilDue > 1) urgencyScore = 80
    else if (daysUntilDue === 1) urgencyScore = 95
    else if (daysUntilDue === 0) urgencyScore = 100

    // Weight factors
    const weights = {
      urgency: 0.4,
      priority: 0.3,
      difficulty: 0.2,
      type: 0.1
    }

    // Type priority (exams and quizzes get higher priority)
    const typePriority = {
      exam: 100,
      quiz: 90,
      project: 80,
      assignment: 70,
      reading: 50,
      study: 40,
      break: 10
    }

    const typeScore = typePriority[task.type] || 50

    // Calculate weighted score
    const finalScore =
      urgencyScore * weights.urgency +
      task.priority * weights.priority +
      task.difficulty * weights.difficulty +
      typeScore * weights.type

    return Math.min(100, Math.max(0, finalScore))
  }

  private findOptimalTimeSlot(
    task: ScheduleTask,
    availableSlots: { start: Date; end: Date }[],
    existingBlocks: StudyBlock[]
  ): StudyBlock | null {
    const requiredEnergy = this.calculateRequiredEnergy(task)
    let bestSlot: StudyBlock | null = null
    let bestScore = -1

    for (const slot of availableSlots) {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)

      // Check if slot is long enough (including natural buffer time between sessions)
      const minRequired = Math.min(task.estimatedDuration, this.config.sessionDuration.min) + this.config.bufferTime
      if (slotDuration < minRequired) {
        continue
      }

      // Calculate how much of the task fits in this slot (leaving buffer for natural breaks)
      const blockDuration = Math.min(
        task.estimatedDuration,
        slotDuration - this.config.bufferTime * 2, // Buffer on both ends
        this.config.sessionDuration.max
      )

      // Get energy level at this time
      const energy = this.getEnergyAtTime(slot.start)

      // Score this slot based on energy match and time until deadline
      const energyMatch = 100 - Math.abs(requiredEnergy - energy.energyLevel)
      const timeScore = this.calculateTimeScore(task, slot.start)
      const score = (energyMatch * 0.6) + (timeScore * 0.4)

      if (score > bestScore) {
        bestScore = score
        bestSlot = {
          id: `block-${Date.now()}-${Math.random()}`,
          taskId: task.id,
          taskTitle: task.title,
          taskType: task.type,
          startTime: slot.start,
          endTime: addHours(slot.start, blockDuration / 60),
          energyRequired: requiredEnergy,
          isOptimal: energy.energyLevel >= requiredEnergy,
          confidence: score
        }
      }
    }

    return bestSlot
  }

  private calculateRequiredEnergy(task: ScheduleTask): number {
    // Higher difficulty tasks require more energy
    // Certain task types also require more focus
    const typeEnergyRequirements = {
      exam: 90,
      quiz: 80,
      project: 75,
      assignment: 70,
      reading: 50,
      study: 60,
      break: 10
    }

    const baseEnergy = typeEnergyRequirements[task.type] || 60
    const difficultyModifier = task.difficulty * 0.3

    return Math.min(100, baseEnergy + difficultyModifier)
  }

  private calculateTimeScore(task: ScheduleTask, proposedTime: Date): number {
    const hoursUntilDue = (task.dueDate.getTime() - proposedTime.getTime()) / (1000 * 60 * 60)

    // Prefer scheduling tasks with enough buffer before deadline
    if (task.type === 'exam' || task.type === 'quiz') {
      // For exams, prefer at least 24 hours before
      if (hoursUntilDue < 24) return 20
      if (hoursUntilDue < 48) return 60
      return 100
    } else {
      // For regular tasks, prefer at least 6 hours before
      if (hoursUntilDue < 6) return 30
      if (hoursUntilDue < 24) return 70
      return 100
    }
  }

  private generateBreaks(studyBlocks: StudyBlock[]): StudyBlock[] {
    // Don't create explicit break blocks - just leave natural gaps between sessions
    return []
  }

  public generateSchedule(
    tasks: ScheduleTask[],
    startDate: Date,
    endDate: Date,
    existingEvents: { start: Date; end: Date }[] = []
  ): StudyBlock[] {
    // Sort tasks by calculated priority
    const sortedTasks = [...tasks]
      .filter(t => !t.completed)
      .sort((a, b) => {
        const priorityA = this.calculateTaskPriority(a, startDate)
        const priorityB = this.calculateTaskPriority(b, startDate)
        return priorityB - priorityA
      })

    const studyBlocks: StudyBlock[] = []
    const scheduledTaskIds = new Set<string>()

    // Generate available time slots for each day
    let currentDate = startOfDay(startDate)
    while (isBefore(currentDate, endDate)) {
      const dayStart = addHours(currentDate, this.config.sleepSchedule.wakeTime)
      const dayEnd = addHours(currentDate, this.config.sleepSchedule.bedtime)

      // Find available slots (excluding existing events)
      const availableSlots = this.findAvailableSlots(
        dayStart,
        dayEnd,
        [...existingEvents, ...studyBlocks]
      )

      // Schedule tasks in priority order
      for (const task of sortedTasks) {
        if (scheduledTaskIds.has(task.id)) continue
        if (isAfter(task.dueDate, endDate)) continue

        const block = this.findOptimalTimeSlot(task, availableSlots, studyBlocks)
        if (block) {
          studyBlocks.push(block)

          // Update remaining duration if task can be split
          if (task.canSplit) {
            const scheduledDuration = (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60)
            task.estimatedDuration -= scheduledDuration

            if (task.estimatedDuration <= 0) {
              scheduledTaskIds.add(task.id)
            }
          } else {
            scheduledTaskIds.add(task.id)
          }
        }
      }

      currentDate = addDays(currentDate, 1)
    }

    // Add breaks between study sessions
    const breaksToAdd = this.generateBreaks(studyBlocks)

    // Sort all blocks by start time
    const allBlocks = [...studyBlocks, ...breaksToAdd].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    )

    return allBlocks
  }

  private findAvailableSlots(
    dayStart: Date,
    dayEnd: Date,
    busySlots: { start: Date; end: Date }[]
  ): { start: Date; end: Date }[] {
    const available: { start: Date; end: Date }[] = []

    // Sort busy slots by start time
    const sorted = [...busySlots].sort((a, b) => a.start.getTime() - b.start.getTime())

    let currentTime = dayStart

    for (const busy of sorted) {
      // If there's a gap before this busy slot
      if (isBefore(currentTime, busy.start)) {
        const gap = (busy.start.getTime() - currentTime.getTime()) / (1000 * 60)
        if (gap >= this.config.sessionDuration.min + this.config.bufferTime) {
          available.push({
            start: currentTime,
            end: busy.start
          })
        }
      }

      // Move current time to end of busy slot
      if (isAfter(busy.end, currentTime)) {
        currentTime = busy.end
      }
    }

    // Check for remaining time at end of day
    if (isBefore(currentTime, dayEnd)) {
      const gap = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60)
      if (gap >= this.config.sessionDuration.min) {
        available.push({
          start: currentTime,
          end: dayEnd
        })
      }
    }

    return available
  }

  public optimizeSchedule(blocks: StudyBlock[], feedback: {
    blockId: string
    completed: boolean
    actualDuration?: number
    energyLevel?: number
    productivity?: number
  }[]): StudyBlock[] {
    // Use feedback to adjust future scheduling
    // This would update energy patterns and time estimates based on actual performance

    // For now, return the original blocks
    // This will be enhanced with machine learning in future iterations
    return blocks
  }
}

// Helper function to convert tasks from store to scheduler format
export function convertToSchedulerTask(task: any): ScheduleTask {
  const typeMap: Record<string, ScheduleTask['type']> = {
    exam: 'exam',
    quiz: 'quiz',
    assignment: 'assignment',
    project: 'project',
    reading: 'reading',
    study: 'study'
  }

  return {
    id: task.id,
    title: task.title,
    courseId: task.courseId,
    type: typeMap[task.type] || 'assignment',
    dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
    estimatedDuration: task.estimatedDuration || 60,
    priority: task.priority || 50,
    difficulty: task.difficulty || 50,
    completed: task.status === 'completed',
    canSplit: task.canSplit !== false,
    minimumBlockSize: task.minimumBlockSize || 25
  }
}