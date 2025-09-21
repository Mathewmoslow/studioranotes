import { Task, TimeBlock, Course, Event, UserPreferences } from '@studioranotes/types';
import { 
  addDays, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  isBefore, 
  isAfter, 
  differenceInDays,
  differenceInHours,
  setHours,
  setMinutes,
  addMinutes,
  isSameDay,
  format
} from 'date-fns';

interface ScheduleChange {
  type: 'task_completed' | 'task_added' | 'task_modified' | 'event_added' | 'event_removed';
  taskId?: string;
  eventId?: string;
  timestamp: Date;
}

interface OptimalSlot {
  start: Date;
  end: Date;
  score: number;
  energyLevel: number;
}

export class DynamicScheduler {
  private preferences: UserPreferences;
  private courses: Course[];
  private events: Event[];
  private existingBlocks: TimeBlock[];
  private completedTasks: Set<string>;
  private changeHistory: ScheduleChange[];
  private autoRescheduleEnabled: boolean;

  constructor(
    preferences: UserPreferences,
    courses: Course[],
    events: Event[],
    existingBlocks: TimeBlock[]
  ) {
    this.preferences = preferences;
    this.courses = courses;
    this.events = events;
    this.existingBlocks = existingBlocks;
    this.completedTasks = new Set();
    this.changeHistory = [];
    this.autoRescheduleEnabled = true;
  }

  /**
   * Main entry point for task completion with auto-rescheduling
   */
  completeTask(taskId: string, allTasks: Task[]): Map<string, TimeBlock[]> {
    // Record the change
    this.changeHistory.push({
      type: 'task_completed',
      taskId,
      timestamp: new Date()
    });

    // Add to completed set
    this.completedTasks.add(taskId);

    // Remove time blocks for completed task
    this.existingBlocks = this.existingBlocks.filter(block => block.taskId !== taskId);

    if (this.autoRescheduleEnabled) {
      // Trigger dynamic rescheduling
      return this.rescheduleRemaining(allTasks);
    }

    return new Map();
  }

  /**
   * Reschedule all remaining incomplete tasks
   */
  rescheduleRemaining(allTasks: Task[]): Map<string, TimeBlock[]> {
    console.log('🔄 Dynamic rescheduling triggered');

    // Get incomplete tasks
    const incompleteTasks = allTasks.filter(task => 
      !this.completedTasks.has(task.id) && 
      task.status !== 'completed' &&
      task.estimatedHours > 0
    );

    // Clear existing auto-generated blocks (keep manual ones)
    const manualBlocks = this.existingBlocks.filter(block => block.isManual === true);
    this.existingBlocks = manualBlocks;

    // Prioritize tasks dynamically
    const prioritizedTasks = this.prioritizeTasks(incompleteTasks);

    // Generate new schedule
    const newSchedule = new Map<string, TimeBlock[]>();

    for (const task of prioritizedTasks) {
      const blocks = this.scheduleTaskAdaptive(task);
      if (blocks.length > 0) {
        newSchedule.set(task.id, blocks);
        this.existingBlocks.push(...blocks);
      }
    }

    console.log(`✅ Rescheduled ${newSchedule.size} tasks with ${this.existingBlocks.length} time blocks`);
    return newSchedule;
  }

  /**
   * Advanced task prioritization based on multiple factors
   */
  private prioritizeTasks(tasks: Task[]): Task[] {
    const now = new Date();

    return tasks.sort((a, b) => {
      // Calculate urgency scores
      const urgencyA = this.calculateUrgency(a, now);
      const urgencyB = this.calculateUrgency(b, now);

      // Calculate importance scores
      const importanceA = this.calculateImportance(a);
      const importanceB = this.calculateImportance(b);

      // Combined score (70% urgency, 30% importance)
      const scoreA = urgencyA * 0.7 + importanceA * 0.3;
      const scoreB = urgencyB * 0.7 + importanceB * 0.3;

      return scoreB - scoreA; // Higher score = higher priority
    });
  }

  /**
   * Calculate urgency based on time until due date
   */
  private calculateUrgency(task: Task, now: Date): number {
    const daysUntilDue = differenceInDays(task.dueDate, now);
    
    if (daysUntilDue <= 0) return 10; // Overdue - maximum urgency
    if (daysUntilDue <= 1) return 9;
    if (daysUntilDue <= 3) return 7;
    if (daysUntilDue <= 7) return 5;
    if (daysUntilDue <= 14) return 3;
    
    // Use exponential decay for longer deadlines
    return Math.max(1, 10 * Math.exp(-daysUntilDue / 7));
  }

  /**
   * Calculate importance based on task type and complexity
   */
  private calculateImportance(task: Task): number {
    const typeWeights: Record<Task['type'], number> = {
      exam: 10,
      project: 8,
      assignment: 6,
      lab: 5,
      reading: 3,
      lecture: 7,
      clinical: 8,
      simulation: 6,
      tutorial: 4,
      quiz: 7,
      video: 4,
      discussion: 5,
      vsim: 7,
      remediation: 8,
      admin: 2,
      prep: 2.5,
      drill: 6
    };

    const baseImportance = typeWeights[task.type] || 5;
    const complexityBonus = task.complexity * 0.5;
    const hardDeadlineBonus = task.isHardDeadline ? 2 : 0;

    return Math.min(10, baseImportance + complexityBonus + hardDeadlineBonus);
  }

  /**
   * Schedule a single task with adaptive slot finding
   */
  private scheduleTaskAdaptive(task: Task): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    const totalHours = this.calculateTotalHours(task);
    const optimalStartDate = this.calculateOptimalStartDate(task, totalHours);
    
    let remainingHours = totalHours;
    let currentDate = optimalStartDate;
    const maxSearchDays = 30; // Prevent infinite loops
    let daysSearched = 0;

    while (remainingHours > 0 && currentDate <= task.dueDate && daysSearched < maxSearchDays) {
      const optimalSlots = this.findOptimalSlots(currentDate, task);
      
      for (const slot of optimalSlots) {
        if (remainingHours <= 0) break;

        const sessionDuration = Math.min(
          remainingHours,
          this.preferences.sessionDuration / 60,
          (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60)
        );

        // Only create blocks of at least 30 minutes
        if (sessionDuration >= 0.5) {
          const block: TimeBlock = {
            id: crypto.randomUUID(),
            taskId: task.id,
            startTime: new Date(slot.start),
            endTime: new Date(slot.start.getTime() + sessionDuration * 60 * 60 * 1000),
            completed: false,
            isManual: false,
            adaptiveScore: slot.score
          };
          
          blocks.push(block);
          remainingHours -= sessionDuration;
          
          // Add break time before next block
          const endTime = typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime;
          slot.start = new Date(endTime.getTime() + this.preferences.breakDuration * 60 * 1000);
        }
      }
      
      currentDate = addDays(currentDate, 1);
      daysSearched++;
    }

    return blocks;
  }

  /**
   * Find optimal time slots for a given day
   */
  private findOptimalSlots(date: Date, task: Task): OptimalSlot[] {
    const slots: OptimalSlot[] = [];
    const dayStart = parse(this.preferences.studyHours.start, 'HH:mm', date);
    const dayEnd = parse(this.preferences.studyHours.end, 'HH:mm', date);
    
    // Get busy times for this day
    const busyTimes = this.getBusyTimes(date);
    
    // Generate potential slots
    let currentTime = dayStart;
    const slotDuration = 30; // Check every 30 minutes

    while (currentTime < dayEnd) {
      const slotEnd = addMinutes(currentTime, this.preferences.sessionDuration);
      
      // Check if slot is available
      if (!this.hasConflict(currentTime, slotEnd, busyTimes)) {
        const score = this.scoreTimeSlot(currentTime, task);
        
        if (score > 0.3) { // Minimum acceptable score
          slots.push({
            start: new Date(currentTime),
            end: new Date(slotEnd),
            score,
            energyLevel: this.getEnergyLevel(currentTime)
          });
        }
      }
      
      currentTime = addMinutes(currentTime, slotDuration);
    }

    // Sort by score (best first)
    return slots.sort((a, b) => b.score - a.score);
  }

  /**
   * Score a time slot based on multiple factors
   */
  private scoreTimeSlot(time: Date, task: Task): number {
    const hour = time.getHours();
    let score = 0.5; // Base score

    // Energy level scoring
    const energyLevel = this.getEnergyLevel(time);
    score += energyLevel * 0.3;

    // Task type preferences
    if (task.type === 'exam' || task.type === 'project') {
      // Prefer morning/afternoon for complex tasks
      if (hour >= 9 && hour <= 15) score += 0.2;
    } else if (task.type === 'reading') {
      // Reading can be done anytime
      score += 0.1;
    }

    // Complexity matching
    if (task.complexity >= 4) {
      // High complexity needs high energy
      if (energyLevel >= 0.8) score += 0.2;
    }

    // Avoid late night for hard tasks
    if (hour >= 22 && task.complexity >= 3) {
      score -= 0.3;
    }

    // Boost score for urgent tasks in any available slot
    const urgency = this.calculateUrgency(task, new Date());
    if (urgency > 7) {
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  /**
   * Get energy level for a specific time
   */
  private getEnergyLevel(time: Date): number {
    const hour = time.getHours();
    const energyLevels = this.preferences.energyLevels || {};
    
    // Use configured energy levels or defaults
    return energyLevels[hour] || this.getDefaultEnergyLevel(hour);
  }

  /**
   * Default energy levels by hour
   */
  private getDefaultEnergyLevel(hour: number): number {
    if (hour >= 6 && hour < 9) return 0.7;   // Early morning
    if (hour >= 9 && hour < 12) return 0.9;  // Morning peak
    if (hour >= 12 && hour < 14) return 0.6; // Post-lunch dip
    if (hour >= 14 && hour < 17) return 0.8; // Afternoon
    if (hour >= 17 && hour < 20) return 0.7; // Early evening
    if (hour >= 20 && hour < 22) return 0.5; // Late evening
    return 0.3; // Night
  }

  /**
   * Check if there's a conflict with existing events
   */
  private hasConflict(start: Date, end: Date, busyTimes: Array<{start: Date, end: Date}>): boolean {
    return busyTimes.some(busy => 
      (start < busy.end && end > busy.start)
    );
  }

  /**
   * Calculate optimal start date for a task
   */
  private calculateOptimalStartDate(task: Task, totalHours: number): Date {
    const hoursPerDay = this.preferences.maxDailyStudyHours || 3;
    const daysNeeded = Math.ceil(totalHours / hoursPerDay);
    
    // Add buffer based on task type
    const bufferDays = task.isHardDeadline ? 1 : 2;
    
    // Calculate ideal start date
    const idealStart = addDays(task.dueDate, -(daysNeeded + bufferDays));
    
    // Don't start before today
    const today = startOfDay(new Date());
    return isAfter(idealStart, today) ? idealStart : today;
  }

  /**
   * Calculate total hours needed including buffer
   */
  private calculateTotalHours(task: Task): number {
    const baseHours = task.estimatedHours || this.estimateHours(task);
    const bufferMultiplier = 1 + (task.bufferPercentage / 100);
    return baseHours * bufferMultiplier;
  }

  /**
   * Estimate hours if not provided
   */
  private estimateHours(task: Task): number {
    const baseHours: Record<Task['type'], number> = {
      assignment: 3,
      exam: 10,
      project: 15,
      reading: 2,
      lab: 4,
      lecture: 1.5,
      clinical: 6,
      simulation: 3,
      tutorial: 1,
      quiz: 2.5,
      video: 1,
      discussion: 1,
      vsim: 1.5,
      remediation: 4,
      admin: 0.5,
      prep: 2,
      drill: 1.5
    };
    
    const complexityMultipliers: Record<number, number> = {
      1: 0.5,
      2: 0.75,
      3: 1,
      4: 1.5,
      5: 2
    };
    
    return baseHours[task.type] * complexityMultipliers[task.complexity];
  }

  /**
   * Get all busy times for a specific day
   */
  private getBusyTimes(date: Date): Array<{start: Date; end: Date}> {
    const busyTimes: Array<{start: Date; end: Date}> = [];
    const dayOfWeek = date.getDay();
    
    // Add course times
    for (const course of this.courses) {
      const courseTimes = course.schedule.filter(s => s.dayOfWeek === dayOfWeek);
      for (const time of courseTimes) {
        busyTimes.push({
          start: parse(time.startTime, 'HH:mm', date),
          end: parse(time.endTime, 'HH:mm', date)
        });
      }
    }
    
    // Add events
    const dayEvents = this.events.filter(event =>
      isWithinInterval(event.startTime, { 
        start: startOfDay(date), 
        end: endOfDay(date) 
      })
    );
    
    for (const event of dayEvents) {
      busyTimes.push({ 
        start: event.startTime, 
        end: event.endTime 
      });
    }
    
    // Add existing time blocks
    const dayBlocks = this.existingBlocks.filter(block =>
      isWithinInterval(block.startTime, { 
        start: startOfDay(date), 
        end: endOfDay(date) 
      })
    );
    
    for (const block of dayBlocks) {
      const startTime = typeof block.startTime === 'string' ? new Date(block.startTime) : block.startTime;
      const endTime = typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime;
      busyTimes.push({ 
        start: startTime, 
        end: endTime 
      });
    }
    
    // Sort and merge overlapping times
    return this.mergeOverlappingTimes(busyTimes);
  }

  /**
   * Merge overlapping time periods
   */
  private mergeOverlappingTimes(times: Array<{start: Date; end: Date}>): Array<{start: Date; end: Date}> {
    if (times.length === 0) return [];
    
    // Sort by start time
    times.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    const merged: Array<{start: Date; end: Date}> = [times[0]];
    
    for (let i = 1; i < times.length; i++) {
      const last = merged[merged.length - 1];
      const current = times[i];
      
      if (current.start <= last.end) {
        // Overlapping - extend end time if needed
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      } else {
        // No overlap - add as new period
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Handle task modification with rescheduling
   */
  modifyTask(taskId: string, changes: Partial<Task>, allTasks: Task[]): Map<string, TimeBlock[]> {
    this.changeHistory.push({
      type: 'task_modified',
      taskId,
      timestamp: new Date()
    });

    if (this.autoRescheduleEnabled) {
      // Remove old blocks for this task
      this.existingBlocks = this.existingBlocks.filter(block => block.taskId !== taskId);
      
      // Reschedule everything
      return this.rescheduleRemaining(allTasks);
    }

    return new Map();
  }

  /**
   * Handle new event addition
   */
  addEvent(event: Event, allTasks: Task[]): Map<string, TimeBlock[]> {
    this.events.push(event);
    
    this.changeHistory.push({
      type: 'event_added',
      eventId: event.id,
      timestamp: new Date()
    });

    if (this.autoRescheduleEnabled) {
      // Check for conflicts and reschedule
      return this.handleConflictsAndReschedule(event, allTasks);
    }

    return new Map();
  }

  /**
   * Handle conflicts when new events are added
   */
  private handleConflictsAndReschedule(newEvent: Event, allTasks: Task[]): Map<string, TimeBlock[]> {
    // Find conflicting time blocks
    const conflictingBlocks = this.existingBlocks.filter(block => {
      return (block.startTime < newEvent.endTime && block.endTime > newEvent.startTime);
    });

    if (conflictingBlocks.length > 0) {
      console.log(`⚠️ Found ${conflictingBlocks.length} conflicting blocks, rescheduling...`);
      
      // Remove conflicting blocks
      const conflictingTaskIds = new Set(conflictingBlocks.map(b => b.taskId));
      this.existingBlocks = this.existingBlocks.filter(block => 
        !conflictingTaskIds.has(block.taskId)
      );

      // Reschedule affected tasks
      return this.rescheduleRemaining(allTasks);
    }

    return new Map();
  }

  /**
   * Enable or disable auto-rescheduling
   */
  setAutoReschedule(enabled: boolean): void {
    this.autoRescheduleEnabled = enabled;
    console.log(`Auto-reschedule ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get scheduling statistics
   */
  getStatistics(): any {
    const totalBlocks = this.existingBlocks.length;
    const completedBlocks = this.existingBlocks.filter(b => b.completed).length;
    const totalHours = this.existingBlocks.reduce((sum, block) => {
      const startTime = typeof block.startTime === 'string' ? new Date(block.startTime) : block.startTime;
      const endTime = typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime;
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return {
      totalBlocks,
      completedBlocks,
      totalHours: Math.round(totalHours * 10) / 10,
      completionRate: totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0,
      changesProcessed: this.changeHistory.length,
      autoRescheduleEnabled: this.autoRescheduleEnabled
    };
  }
}

// Helper function to parse time strings
function parse(timeStr: string, format: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}