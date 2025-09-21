import { Task, TimeBlock, Course, UserPreferences, Event } from '@studioranotes/types';
import { addDays, startOfDay, endOfDay, isWithinInterval, format, parse, isBefore, isAfter, differenceInDays } from 'date-fns';

export class TaskScheduler {
  private preferences: UserPreferences;
  private courses: Course[];
  private events: Event[];
  private existingBlocks: TimeBlock[];

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
  }

  scheduleTask(task: Task): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    const totalHours = this.calculateTotalHours(task);
    const startDate = this.calculateStartDate(task, totalHours);
    
    let remainingHours = totalHours;
    let currentDate = startDate;
    
    // Don't schedule past the due date
    while (remainingHours > 0 && currentDate <= task.dueDate) {
      const availableSlots = this.getAvailableSlots(currentDate);
      
      for (const slot of availableSlots) {
        if (remainingHours <= 0) break;
        
        const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60);
        const sessionDuration = Math.min(
          remainingHours,
          this.preferences.sessionDuration / 60,
          slotDuration
        );
        
        // Only create blocks of at least 30 minutes
        if (sessionDuration >= 0.5) {
          const block: TimeBlock = {
            id: crypto.randomUUID(),
            taskId: task.id,
            startTime: new Date(slot.start),
            endTime: new Date(slot.start.getTime() + sessionDuration * 60 * 60 * 1000),
            completed: false
          };
          
          blocks.push(block);
          remainingHours -= sessionDuration;
          
          // Update slot start time for next potential block
          const endTime = typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime;
          slot.start = new Date(endTime.getTime() + this.preferences.breakDuration * 60 * 1000);
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    return blocks;
  }

  scheduleAllTasks(tasks: Task[]): Map<string, TimeBlock[]> {
    const scheduledBlocks = new Map<string, TimeBlock[]>();
    
    // Sort tasks by priority: due date, then complexity
    const sortedTasks = [...tasks]
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        const daysDiffA = differenceInDays(a.dueDate, new Date());
        const daysDiffB = differenceInDays(b.dueDate, new Date());
        
        // Prioritize tasks due sooner
        if (daysDiffA !== daysDiffB) {
          return daysDiffA - daysDiffB;
        }
        
        // Then by complexity (higher complexity first)
        return b.complexity - a.complexity;
      });
    
    // Schedule each task
    for (const task of sortedTasks) {
      const blocks = this.scheduleTask(task);
      if (blocks.length > 0) {
        scheduledBlocks.set(task.id, blocks);
        // Add these blocks to existing blocks to avoid conflicts
        this.existingBlocks.push(...blocks);
      }
    }
    
    return scheduledBlocks;
  }

  private calculateTotalHours(task: Task): number {
    const baseHours = task.estimatedHours || this.estimateHours(task);
    const bufferMultiplier = 1 + (task.bufferPercentage / 100);
    return baseHours * bufferMultiplier;
  }

  private estimateHours(task: Task): number {
    // Base hours by task type
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
    
    // Complexity multipliers
    const complexityMultipliers: Record<number, number> = {
      1: 0.5,
      2: 0.75,
      3: 1,
      4: 1.5,
      5: 2
    };
    
    return baseHours[task.type] * complexityMultipliers[task.complexity];
  }

  private calculateStartDate(task: Task, totalHours: number): Date {
    const hoursPerDay = 3; // Average study hours per day
    const daysNeeded = Math.ceil(totalHours / hoursPerDay);
    const bufferDays = task.isHardDeadline ? 1 : 2;
    
    const startDate = addDays(task.dueDate, -(daysNeeded + bufferDays));
    
    // Don't start before today
    const today = startOfDay(new Date());
    return isAfter(startDate, today) ? startDate : today;
  }

  private getAvailableSlots(date: Date): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const dayStart = parse(this.preferences.studyHours.start, 'HH:mm', date);
    const dayEnd = parse(this.preferences.studyHours.end, 'HH:mm', date);
    
    // Get all busy times for this day (events and existing blocks)
    const busyTimes = this.getBusyTimes(date);
    
    // If no busy times, return the whole study period
    if (busyTimes.length === 0) {
      return [{ start: dayStart, end: dayEnd }];
    }
    
    // Find gaps between busy times
    let currentTime = dayStart;
    
    for (const busy of busyTimes) {
      if (currentTime < busy.start && isAfter(busy.start, currentTime)) {
        slots.push({ 
          start: new Date(currentTime), 
          end: new Date(busy.start) 
        });
      }
      if (isAfter(busy.end, currentTime)) {
        currentTime = busy.end;
      }
    }
    
    // Add final slot if there's time left
    if (currentTime < dayEnd) {
      slots.push({ 
        start: new Date(currentTime), 
        end: dayEnd 
      });
    }
    
    // Filter out slots that are too small (less than 30 minutes)
    return slots.filter(slot => {
      const duration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60);
      return duration >= 0.5;
    });
  }

  private getBusyTimes(date: Date): Array<{ start: Date; end: Date }> {
    const busyTimes: Array<{ start: Date; end: Date }> = [];
    const dayOfWeek = date.getDay();
    
    // Add recurring course times (excluding async courses)
    for (const course of this.courses) {
      const courseTimes = course.schedule.filter(s => 
        s.dayOfWeek === dayOfWeek && s.type !== 'async'
      );
      for (const time of courseTimes) {
        busyTimes.push({
          start: parse(time.startTime, 'HH:mm', date),
          end: parse(time.endTime, 'HH:mm', date)
        });
      }
    }
    
    // Add events for this day
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
    
    // Sort by start time and merge overlapping periods
    busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Merge overlapping busy times
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const busy of busyTimes) {
      if (merged.length === 0) {
        merged.push(busy);
      } else {
        const last = merged[merged.length - 1];
        if (busy.start <= last.end) {
          // Overlapping, extend the end time if needed
          last.end = new Date(Math.max(last.end.getTime(), busy.end.getTime()));
        } else {
          merged.push(busy);
        }
      }
    }
    
    return merged;
  }

  // Get total async course hours per week
  getAsyncCourseHours(): number {
    let totalHours = 0;
    for (const course of this.courses) {
      const asyncSchedules = course.schedule.filter(s => s.type === 'async');
      for (const schedule of asyncSchedules) {
        totalHours += schedule.weeklyHours || 0;
      }
    }
    return totalHours;
  }

  // Create study blocks for async courses
  scheduleAsyncCourses(weekStartDate: Date): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    const asyncCourses = this.courses.filter(course => 
      course.schedule.some(s => s.type === 'async')
    );

    for (const course of asyncCourses) {
      for (const schedule of course.schedule) {
        if (schedule.type === 'async' && schedule.weeklyHours) {
          // Distribute weekly hours across available study days
          const hoursPerDay = schedule.weeklyHours / 5; // Distribute across weekdays
          
          for (let day = 0; day < 5; day++) {
            const currentDate = addDays(weekStartDate, day);
            const availableSlots = this.getAvailableSlots(currentDate);
            
            let remainingHours = hoursPerDay;
            for (const slot of availableSlots) {
              if (remainingHours <= 0) break;
              
              const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60);
              const sessionDuration = Math.min(remainingHours, slotDuration, 2); // Max 2 hour sessions
              
              if (sessionDuration >= 0.5) {
                const block: TimeBlock = {
                  id: crypto.randomUUID(),
                  taskId: `async-${course.id}-${schedule.dayOfWeek}`,
                  startTime: new Date(slot.start),
                  endTime: new Date(slot.start.getTime() + sessionDuration * 60 * 60 * 1000),
                  completed: false,
                  title: `${course.name} (Async Study)`,
                  color: course.color
                };
                
                blocks.push(block);
                remainingHours -= sessionDuration;
                this.existingBlocks.push(block);
                
                // Update slot for next iteration
                const endTime = typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime;
                slot.start = new Date(endTime.getTime() + 15 * 60 * 1000); // 15 min break
              }
            }
          }
        }
      }
    }
    
    return blocks;
  }
}
