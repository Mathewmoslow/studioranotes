// src/core/algorithms/studyScheduler.ts

import { addDays, startOfDay, endOfDay, isWeekend, differenceInDays, isBefore, isAfter, setHours, setMinutes } from 'date-fns';
import { Task, TimeBlock } from '@studioranotes/types';

interface StudyBlock {
  id: string;
  taskId: string;
  courseId: string;
  title: string;
  type: 'study' | 'review';
  date: string;
  start: string;
  end: string;
  hours: number;
  priority: string;
  energyRequired: string;
  assignmentTitle: string;
  assignmentType: string;
}

interface ExistingEvent {
  id: string;
  start: Date;
  end: Date;
  type: string;
}

interface Preferences {
  dailyMaxHours: number;
  weekendMaxHours: number;
  blockDuration: number;
  preferredTimes: {
    morning: { start: number; end: number; weight: number; energy: number };
    afternoon: { start: number; end: number; weight: number; energy: number };
    evening: { start: number; end: number; weight: number; energy: number };
    night?: { start: number; end: number; weight: number; energy: number };
  };
  energyLevels: {
    [key: string]: number;
  };
  bufferBeforeExam?: number;
  reviewPercentage?: number;
  breakBetweenBlocks?: number;
  spreadStrategy?: 'distributed' | 'compressed';
  leadTimeDefaults?: {
    exam: number;
    assignment: number;
    project: number;
    quiz: number;
    default: number;
  };
  minBlockSize?: number;
  maxBlockSize?: number;
}

export class StudyScheduler {
  private studyBlocks: StudyBlock[] = [];
  private completedTasks: Set<string> = new Set();
  private preferences: Preferences = {
    dailyMaxHours: 6,
    weekendMaxHours: 4,
    blockDuration: 1.5,
    preferredTimes: {
      morning: { start: 6, end: 12, weight: 0.9, energy: 0.9 },
      afternoon: { start: 13, end: 17, weight: 0.7, energy: 0.7 },
      evening: { start: 17, end: 20, weight: 0.8, energy: 0.8 },
      night: { start: 20, end: 22, weight: 0.5, energy: 0.5 }
    },
    energyLevels: {
      monday: 0.9,
      tuesday: 1.0,
      wednesday: 0.95,
      thursday: 0.85,
      friday: 0.7,
      saturday: 0.8,
      sunday: 0.9
    },
    bufferBeforeExam: 2,
    reviewPercentage: 0.2,
    breakBetweenBlocks: 0.25,
    spreadStrategy: 'distributed', // 'distributed' or 'compressed'
    leadTimeDefaults: {
      exam: 7,        // Start studying 7 days before exam
      assignment: 3,  // Start 3 days before assignment
      project: 5,     // Start 5 days before project
      quiz: 2,        // Start 2 days before quiz
      default: 3      // Default lead time
    },
    minBlockSize: 0.5,  // Minimum 30 minutes
    maxBlockSize: 2.0   // Maximum 2 hours per block
  };

  /**
   * Generate study schedule for all tasks
   */
  generateSchedule(
    tasks: Task[], 
    courses: any[], 
    existingEvents: ExistingEvent[], 
    startDate: Date, 
    endDate: Date
  ): StudyBlock[] {
    this.studyBlocks = [];
    
    // Filter and prepare tasks
    const tasksToSchedule = tasks
      .filter(task => task.status !== 'completed' && task.estimatedHours > 0)
      .map(task => ({
        ...task,
        totalHours: this.calculateStudyTime(task),
        hoursScheduled: 0,
        completed: false
      }));

    // Sort by priority and due date
    const prioritizedTasks = this.prioritizeTasks(tasksToSchedule);

    // Schedule each task
    prioritizedTasks.forEach(task => {
      this.scheduleTask(task, existingEvents, startDate, endDate);
    });

    // Add review sessions for exams
    this.addReviewSessions(prioritizedTasks, existingEvents, startDate, endDate);

    // Optimize schedule
    this.optimizeForEnergyLevels();

    return this.studyBlocks;
  }

  /**
   * Calculate total study time needed
   */
  private calculateStudyTime(task: Task): number {
    let baseHours = task.estimatedHours;
    
    // Apply complexity multiplier
    const complexityMultiplier = 0.5 + (task.complexity * 0.3);
    baseHours *= complexityMultiplier;
    
    // Apply type multiplier
    const typeMultipliers: { [key: string]: number } = {
      'exam': 1.5,
      'project': 1.3,
      'assignment': 1.0,
      'reading': 0.9,
      'lab': 0.8
    };
    baseHours *= typeMultipliers[task.type] || 1.0;
    
    // Add buffer time
    const bufferMultiplier = 1 + (task.bufferPercentage / 100);
    baseHours *= bufferMultiplier;
    
    // Add review time for exams
    if (task.type === 'exam') {
      baseHours += baseHours * (this.preferences.reviewPercentage || 0.2);
    }
    
    return Math.round(baseHours * 2) / 2; // Round to nearest 0.5
  }

  /**
   * Prioritize tasks by urgency and importance
   */
  private prioritizeTasks(tasks: any[]): any[] {
    return tasks.sort((a, b) => {
      // Calculate urgency score (days until due)
      const daysUntilA = differenceInDays(a.dueDate, new Date());
      const daysUntilB = differenceInDays(b.dueDate, new Date());
      
      // Urgency factor (exponential decay)
      const urgencyA = Math.exp(-daysUntilA / 7);
      const urgencyB = Math.exp(-daysUntilB / 7);
      
      // Importance factor (based on type and complexity)
      const importanceA = (a.complexity / 5) * (a.type === 'exam' ? 2 : 1);
      const importanceB = (b.complexity / 5) * (b.type === 'exam' ? 2 : 1);
      
      // Combined score
      const scoreA = urgencyA * 0.7 + importanceA * 0.3;
      const scoreB = urgencyB * 0.7 + importanceB * 0.3;
      
      return scoreB - scoreA;
    });
  }

  /**
   * Schedule a single task
   */
  private scheduleTask(task: any, existingEvents: ExistingEvent[], startDate: Date, endDate: Date): void {
    const dueDate = new Date(task.dueDate);
    
    // Use lead time from task or defaults
    const leadTime = task.leadTime || 
      this.preferences.leadTimeDefaults?.[task.type as keyof typeof this.preferences.leadTimeDefaults] ||
      this.preferences.leadTimeDefaults?.default || 3;
    
    const bufferDays = task.type === 'exam' ? 3 : task.bufferDays || 2;
    const targetEndDate = addDays(dueDate, -bufferDays);
    const idealStartDate = addDays(dueDate, -leadTime);
    
    // Calculate scheduling window
    const actualStartDate = isAfter(startDate, idealStartDate) ? startDate : idealStartDate;
    const schedulingWindow = differenceInDays(targetEndDate, actualStartDate);
    
    // Determine distribution strategy
    let daysToUse: Date[] = [];
    if (this.preferences.spreadStrategy === 'distributed' && schedulingWindow > 7) {
      // Spread throughout available time
      daysToUse = this.getDistributedDays(actualStartDate, targetEndDate, task.totalHours);
    } else {
      // Compress closer to due date
      const daysNeeded = Math.ceil(task.totalHours / this.preferences.dailyMaxHours);
      const compressedStart = addDays(targetEndDate, -Math.min(daysNeeded * 1.5, schedulingWindow));
      daysToUse = this.getCompressedDays(compressedStart, targetEndDate, task.totalHours);
    }
    
    let remainingHours = task.totalHours;
    
    // Schedule on selected days
    for (const currentDate of daysToUse) {
      if (remainingHours <= 0) break;
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const energyLevel = this.preferences.energyLevels[dayName] || 1;
      const isWeekendDay = isWeekend(currentDate);
      
      // Calculate max hours for this day
      const baseMaxHours = isWeekendDay ? 
        this.preferences.weekendMaxHours : 
        this.preferences.dailyMaxHours;
      const adjustedMaxHours = baseMaxHours * energyLevel;
      
      // Check existing hours scheduled
      const scheduledHours = this.getScheduledHours(currentDate);
      const availableHours = Math.max(0, adjustedMaxHours - scheduledHours);
      
      if (availableHours > 0) {
        const hoursToSchedule = Math.min(
          this.preferences.blockDuration,
          remainingHours,
          availableHours
        );
        
        if (hoursToSchedule >= 0.5) {
          const timeSlot = this.findBestTimeSlot(
            currentDate,
            hoursToSchedule,
            existingEvents,
            task.type
          );
          
          if (timeSlot) {
            this.studyBlocks.push({
              id: `study_${task.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              taskId: task.id,
              courseId: task.courseId,
              title: `Study: ${task.title}`,
              type: 'study',
              date: timeSlot.date,
              start: timeSlot.start,
              end: timeSlot.end,
              hours: hoursToSchedule,
              priority: task.isHardDeadline ? 'high' : 'medium',
              energyRequired: this.getEnergyRequired(task.type),
              assignmentTitle: task.title,
              assignmentType: task.type
            });
            
            remainingHours -= hoursToSchedule;
          }
        }
      }
    }
  }
  
  /**
   * Get distributed days for spreading tasks throughout semester
   */
  private getDistributedDays(startDate: Date, endDate: Date, totalHours: number): Date[] {
    const days: Date[] = [];
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const hoursPerDay = this.preferences.dailyMaxHours * 0.5; // Use only 50% capacity for distribution
    const daysNeeded = Math.ceil(totalHours / hoursPerDay);
    
    if (totalDays <= daysNeeded) {
      // Not enough days, use all available
      let current = new Date(startDate);
      while (isBefore(current, endDate) || current.getTime() === endDate.getTime()) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
    } else {
      // Distribute evenly
      const interval = Math.floor(totalDays / daysNeeded);
      let current = new Date(startDate);
      
      for (let i = 0; i < daysNeeded && isBefore(current, endDate); i++) {
        days.push(new Date(current));
        current = addDays(current, interval);
      }
    }
    
    return days;
  }
  
  /**
   * Get compressed days for scheduling closer to due date
   */
  private getCompressedDays(startDate: Date, endDate: Date, totalHours: number): Date[] {
    const days: Date[] = [];
    let current = new Date(startDate);
    
    while ((isBefore(current, endDate) || current.getTime() === endDate.getTime()) && days.length < 30) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  }

  /**
   * Find best time slot for studying
   */
  private findBestTimeSlot(
    date: Date, 
    hours: number, 
    existingEvents: ExistingEvent[], 
    taskType: string
  ): { date: string; start: string; end: string } | null {
    const dayEvents = existingEvents.filter(event => {
      const eventDate = event.start;
      return startOfDay(eventDate).getTime() === startOfDay(date).getTime();
    });
    
    // Get ALL available slots for the day
    const allSlots = this.findAllAvailableSlots(date, dayEvents, hours);
    
    if (allSlots.length === 0) return null;
    
    // Score each slot based on multiple factors
    const scoredSlots = allSlots.map(slot => {
      const score = this.calculateSlotScore(slot, date, taskType, dayEvents);
      return { ...slot, score };
    });
    
    // Sort by score and pick the best one
    scoredSlots.sort((a, b) => b.score - a.score);
    
    // Add some randomization to avoid always picking the same time
    const topSlots = scoredSlots.slice(0, Math.min(3, scoredSlots.length));
    const selectedIndex = Math.floor(Math.random() * topSlots.length);
    
    return topSlots[selectedIndex];
  }

  /**
   * Get preferred study periods based on task type
   */
  private getPreferredPeriods(taskType: string): string[] {
    const preferences: { [key: string]: string[] } = {
      'exam': ['morning', 'afternoon'],
      'reading': ['evening', 'afternoon'],
      'project': ['afternoon', 'morning'],
      'assignment': ['afternoon', 'evening'],
      'lab': ['morning', 'afternoon']
    };
    
    return preferences[taskType] || ['morning', 'afternoon', 'evening'];
  }

  /**
   * Find ALL available time slots in a day
   */
  private findAllAvailableSlots(
    date: Date,
    dayEvents: ExistingEvent[],
    hoursNeeded: number
  ): { date: string; start: string; end: string; period: string }[] {
    const slots: { date: string; start: string; end: string; period: string }[] = [];
    
    // Check all time periods
    for (const [periodName, period] of Object.entries(this.preferences.preferredTimes)) {
      const periodSlots = this.findAvailableSlots(
        date,
        period.start,
        period.end,
        dayEvents,
        hoursNeeded
      );
      
      // Tag each slot with its period
      periodSlots.forEach(slot => {
        slots.push({ ...slot, period: periodName });
      });
    }
    
    return slots;
  }
  
  /**
   * Calculate score for a time slot
   */
  private calculateSlotScore(
    slot: { date: string; start: string; end: string; period: string },
    date: Date,
    taskType: string,
    dayEvents: ExistingEvent[]
  ): number {
    let score = 100;
    
    // Factor 1: Preferred time for task type
    const preferredPeriods = this.getPreferredPeriods(taskType);
    const periodIndex = preferredPeriods.indexOf(slot.period);
    if (periodIndex >= 0) {
      score += (3 - periodIndex) * 20; // First preference gets +60, second +40, third +20
    }
    
    // Factor 2: Energy level for the day
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const energyLevel = this.preferences.energyLevels[dayName] || 1;
    score += energyLevel * 30;
    
    // Factor 3: Avoid clustering (check nearby study blocks)
    const slotStart = new Date(slot.start);
    const nearbyBlocks = this.studyBlocks.filter(block => {
      const blockStart = new Date(block.start);
      const timeDiff = Math.abs(blockStart.getTime() - slotStart.getTime());
      return timeDiff < 4 * 60 * 60 * 1000; // Within 4 hours
    });
    score -= nearbyBlocks.length * 15; // Penalize clustering
    
    // Factor 4: Time of day distribution
    const hour = slotStart.getHours();
    const existingAtHour = this.studyBlocks.filter(block => {
      const blockStart = new Date(block.start);
      return blockStart.getHours() === hour;
    }).length;
    score -= existingAtHour * 10; // Prefer variety in start times
    
    // Factor 5: Task complexity vs energy period
    if (taskType === 'exam' || taskType === 'project') {
      // Complex tasks prefer high-energy times
      if (slot.period === 'morning' || slot.period === 'afternoon') {
        score += 20;
      }
    } else if (taskType === 'reading') {
      // Reading can be done in lower energy times
      if (slot.period === 'evening') {
        score += 10;
      }
    }
    
    return Math.max(0, score);
  }
  
  /**
   * Find available time slots in a specific period
   */
  private findAvailableSlots(
    date: Date, 
    periodStart: number, 
    periodEnd: number, 
    dayEvents: ExistingEvent[], 
    hoursNeeded: number
  ): { date: string; start: string; end: string }[] {
    const slots: { date: string; start: string; end: string }[] = [];
    
    // Try multiple starting times throughout the period
    const timeSlots = [];
    
    // Distribute start times across the period
    const periodDuration = periodEnd - periodStart;
    const numSlots = Math.min(5, Math.floor(periodDuration / hoursNeeded));
    
    for (let i = 0; i < numSlots; i++) {
      const offsetHours = (periodDuration / numSlots) * i;
      const startHour = periodStart + offsetHours;
      
      // Round to nearest 30 minutes
      const minutes = (startHour % 1) * 60;
      const roundedMinutes = Math.round(minutes / 30) * 30;
      const roundedHour = Math.floor(startHour) + (roundedMinutes / 60);
      
      if (roundedHour + hoursNeeded <= periodEnd) {
        const currentTime = setMinutes(setHours(date, Math.floor(roundedHour)), (roundedHour % 1) * 60);
        const slotEnd = new Date(currentTime.getTime() + hoursNeeded * 60 * 60 * 1000);
        
        // Check conflicts
        const hasConflict = dayEvents.some(event => {
          return (currentTime < event.end && slotEnd > event.start);
        });
        
        if (!hasConflict) {
          slots.push({
            date: date.toISOString().split('T')[0],
            start: currentTime.toISOString(),
            end: slotEnd.toISOString()
          });
        }
      }
    }
    
    // If no distributed slots work, fall back to scanning every 30 minutes
    if (slots.length === 0) {
      let currentTime = setMinutes(setHours(date, periodStart), 0);
      const endTime = setMinutes(setHours(date, periodEnd), 0);
      
      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime.getTime() + hoursNeeded * 60 * 60 * 1000);
        
        // Check conflicts
        const hasConflict = dayEvents.some(event => {
          return (currentTime < event.end && slotEnd > event.start);
        });
        
        if (!hasConflict && slotEnd <= endTime) {
          slots.push({
            date: date.toISOString().split('T')[0],
            start: currentTime.toISOString(),
            end: slotEnd.toISOString()
          });
        }
        
        // Move to next slot
        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 min increments
      }
    }
    
    return slots;
  }

  /**
   * Get total hours already scheduled for a day
   */
  private getScheduledHours(date: Date): number {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    return this.studyBlocks
      .filter(block => {
        const blockStart = new Date(block.start);
        return blockStart >= dayStart && blockStart <= dayEnd;
      })
      .reduce((total, block) => total + block.hours, 0);
  }

  /**
   * Add review sessions before exams
   */
  private addReviewSessions(
    tasks: any[], 
    existingEvents: ExistingEvent[], 
    startDate: Date, 
    endDate: Date
  ): void {
    const exams = tasks.filter(t => t.type === 'exam');
    
    exams.forEach(exam => {
      const examDate = new Date(exam.dueDate);
      const reviewDays = this.preferences.bufferBeforeExam || 2;
      
      for (let i = 1; i <= reviewDays; i++) {
        const reviewDate = addDays(examDate, -i);
        if (isAfter(reviewDate, startDate) && isBefore(reviewDate, endDate)) {
          const reviewHours = 2;
          
          const timeSlot = this.findBestTimeSlot(
            reviewDate,
            reviewHours,
            existingEvents,
            'review'
          );
          
          if (timeSlot) {
            this.studyBlocks.push({
              id: `review_${exam.id}_${i}_${Date.now()}`,
              taskId: exam.id,
              courseId: exam.courseId,
              title: `Review: ${exam.title}`,
              type: 'review',
              date: timeSlot.date,
              start: timeSlot.start,
              end: timeSlot.end,
              hours: reviewHours,
              priority: 'high',
              energyRequired: 'high',
              assignmentTitle: exam.title,
              assignmentType: 'exam'
            });
          }
        }
      }
    });
  }

  /**
   * Optimize schedule based on energy levels
   */
  private optimizeForEnergyLevels(): void {
    // Group blocks by energy requirement
    const highEnergyBlocks = this.studyBlocks.filter(b => 
      this.getEnergyRequired(b.assignmentType) === 'high'
    );
    
    // Check if high-energy tasks are scheduled on low-energy days
    highEnergyBlocks.forEach(block => {
      const blockDate = new Date(block.start);
      const dayName = blockDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const energyLevel = this.preferences.energyLevels[dayName];
      
      if (energyLevel < 0.8) {
        // Mark as suboptimal (in a real implementation, we'd try to reschedule)
        console.log(`Warning: High-energy task scheduled on low-energy day (${dayName})`);
      }
    });
  }

  /**
   * Get energy requirement for task type
   */
  private getEnergyRequired(type: string): string {
    const energyLevels: { [key: string]: string } = {
      'exam': 'high',
      'project': 'high',
      'assignment': 'medium',
      'reading': 'medium',
      'lab': 'medium',
      'quiz': 'medium',
      'video': 'low',
      'vsim': 'high',
      'remediation': 'medium',
      'prep': 'high',
      'drill': 'medium'
    };
    return energyLevels[type] || 'medium';
  }

  /**
   * Find optimal time slot based on task preferences
   */
  private findOptimalTimeSlot(
    date: Date,
    task: any,
    hoursNeeded: number,
    existingEvents: ExistingEvent[]
  ): { date: string; start: string; end: string; score: number } | null {
    const slots: Array<{ date: string; start: string; end: string; score: number }> = [];
    
    // Get task preferred times
    const preferredTimes = task.preferredTimes || ['morning', 'afternoon', 'evening'];
    const requiresFocus = task.requiresFocus !== false;
    const difficulty = task.difficulty || 'medium';
    
    // Check each preferred time period
    for (const timePeriod of preferredTimes) {
      const period = this.preferences.preferredTimes[timePeriod as keyof typeof this.preferences.preferredTimes];
      if (!period) continue;
      
      // Adjust hours based on energy and focus requirements
      let effectiveHours = hoursNeeded;
      if (requiresFocus && period.energy < 0.7) {
        effectiveHours *= 1.2; // Need more time if low energy and high focus
      }
      
      // Use best chunk size if specified
      const chunkSize = task.bestChunkSize || this.preferences.maxBlockSize || 2.0;
      effectiveHours = Math.min(effectiveHours, chunkSize);
      
      // Find available slot in this period
      const periodSlots = this.findAvailableSlots(
        date,
        period.start,
        period.end,
        existingEvents,
        effectiveHours
      );
      
      periodSlots.forEach(slot => {
        // Calculate slot score based on multiple factors
        let score = 100;
        
        // Energy match score
        const energyRequired = this.getEnergyRequired(task.type);
        if (energyRequired === 'high' && period.energy >= 0.8) score += 30;
        else if (energyRequired === 'low' && period.energy < 0.6) score += 20;
        
        // Difficulty alignment
        if (difficulty === 'hard' && timePeriod === 'morning') score += 25;
        else if (difficulty === 'easy' && timePeriod === 'evening') score += 15;
        
        // Focus requirement alignment
        if (requiresFocus && (timePeriod === 'morning' || timePeriod === 'afternoon')) score += 20;
        
        slots.push({ ...slot, score });
      });
    }
    
    // Return best scoring slot
    if (slots.length > 0) {
      slots.sort((a, b) => b.score - a.score);
      return slots[0];
    }
    
    return null;
  }

  /**
   * Update preferences
   */
  updatePreferences(newPreferences: Partial<Preferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const totalHours = this.studyBlocks.reduce((sum, block) => sum + block.hours, 0);
    const byType: { [key: string]: number } = {};
    const byCourse: { [key: string]: number } = {};
    const byDay: { [key: string]: number } = {};
    
    this.studyBlocks.forEach(block => {
      // By type
      byType[block.type] = (byType[block.type] || 0) + block.hours;
      
      // By course
      byCourse[block.courseId] = (byCourse[block.courseId] || 0) + block.hours;
      
      // By day
      const day = new Date(block.start).toLocaleDateString('en-US', { weekday: 'long' });
      byDay[day] = (byDay[day] || 0) + block.hours;
    });
    
    return {
      totalHours,
      averagePerDay: totalHours / 7,
      byType,
      byCourse,
      byDay,
      blockCount: this.studyBlocks.length
    };
  }

  /**
   * Export for calendar
   */
  exportForCalendar(): any[] {
    return this.studyBlocks.map(block => ({
      id: block.id,
      title: block.title,
      start: block.start,
      end: block.end,
      backgroundColor: block.type === 'review' ? '#8b5cf6' : '#10b981',
      textColor: '#ffffff',
      extendedProps: {
        type: block.type,
        taskId: block.taskId,
        courseId: block.courseId,
        hours: block.hours,
        priority: block.priority,
        energyRequired: block.energyRequired,
        assignmentTitle: block.assignmentTitle
      }
    }));
  }
  
  /**
   * Mark task as completed and trigger rescheduling
   */
  completeTask(taskId: string): StudyBlock[] {
    this.completedTasks.add(taskId);
    
    // Remove study blocks for completed task
    this.studyBlocks = this.studyBlocks.filter(block => block.taskId !== taskId);
    
    // Return updated blocks
    return this.studyBlocks;
  }
  
  /**
   * Dynamic rescheduling when a task is completed
   */
  dynamicReschedule(
    tasks: Task[], 
    courses: any[], 
    existingEvents: ExistingEvent[], 
    startDate: Date, 
    endDate: Date
  ): StudyBlock[] {
    // Clear current blocks but keep completed task tracking
    this.studyBlocks = [];
    
    // Filter out completed tasks
    const activeTasks = tasks.filter(task => 
      !this.completedTasks.has(task.id) && 
      task.status !== 'completed'
    );
    
    // Regenerate schedule with remaining tasks
    return this.generateSchedule(activeTasks, courses, existingEvents, startDate, endDate);
  }
}