import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Course, Task, TimeBlock, Event, UserPreferences } from '@studioranotes/types';
import { addDays, startOfDay, endOfDay, isBefore, isAfter, differenceInDays, subDays, isSameDay } from 'date-fns';
import { notificationService } from '../lib/notificationService';
import { DynamicScheduler as OldDynamicScheduler } from '../lib/algorithms/dynamicScheduler';
import { DynamicScheduler, convertToSchedulerTask, StudyBlock as SchedulerStudyBlock } from '../lib/scheduler/algorithm';

// Helper function to generate recurring lecture events
const generateLectureEventsForCourse = (
  course: Course,
  get: () => any,
  set: (state: any) => void
) => {
  if (!course.schedule || course.schedule.length === 0) return;
  
  const state = get();
  const lectureEvents: Event[] = [];
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 4); // Generate for 4 months (semester)
  
  // For each day in the semester
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    
    // Check if this course has a lecture on this day
    course.schedule.forEach(scheduleItem => {
      // RecurringEvent has dayOfWeek property (0-6 where 0 = Sunday)
      if (scheduleItem.dayOfWeek === dayOfWeek && scheduleItem.startTime && scheduleItem.endTime) {
        // Parse time strings (e.g., "09:00" -> hours and minutes)
        const [startHour, startMin] = scheduleItem.startTime.split(':').map(Number);
        const [endHour, endMin] = scheduleItem.endTime.split(':').map(Number);
        
        const lectureStart = new Date(currentDate);
        lectureStart.setHours(startHour, startMin, 0, 0);
        
        const lectureEnd = new Date(currentDate);
        lectureEnd.setHours(endHour, endMin, 0, 0);
        
        // Check if there's an exam on this day for this course
        const hasExamToday = state.events.some((e: Event) => 
          e.type === 'exam' && 
          e.courseId === course.id && 
          isSameDay(new Date(e.startTime), currentDate)
        );
        
        // Skip lecture if there's an exam
        if (!hasExamToday) {
          const lectureEvent: Event = {
            id: uuidv4(),
            title: `${course.name} ${scheduleItem.type === 'lecture' ? 'Lecture' : scheduleItem.type}`,
            type: 'lecture' as const,
            courseId: course.id,
            startTime: lectureStart,
            endTime: lectureEnd,
            location: scheduleItem.room || course.room || course.name,
            description: `Regular ${scheduleItem.type} for ${course.name}`,
          };
          
          lectureEvents.push(lectureEvent);
        }
      }
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Add all lecture events to the store
  if (lectureEvents.length > 0) {
    set((state: any) => ({
      events: [...state.events, ...lectureEvents]
    }));
    console.log(`Generated ${lectureEvents.length} lecture events for ${course.name}`);
  }
};

interface ScheduleStore {
  courses: Course[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  events: Event[];
  preferences: UserPreferences;
  settings: {
    googleBackupEnabled?: boolean;
    autoBackupInterval?: number;
    lastBackupTime?: string;
    notificationsEnabled?: boolean;
  };
  autoRescheduleEnabled: boolean;
  dynamicScheduler: DynamicScheduler | null;
  energyPatterns: Array<{ hour: number; energyLevel: number; productivity: number }>;
  schedulerConfig: {
    dailyStudyHours: { min: number; max: number; preferred: number };
    breakDuration: { short: number; long: number };
    sessionDuration: { min: number; max: number; preferred: number };
  };
  
  // Course actions
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (id: string, course: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  
  // Task actions
  addTask: (task: Omit<Task, 'id' | 'scheduledBlocks'>) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  
  // TimeBlock actions
  addTimeBlock: (timeBlock: Omit<TimeBlock, 'id'>) => void;
  updateTimeBlock: (id: string, timeBlock: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;
  toggleTimeBlockComplete: (id: string) => void;
  
  // Event actions
  addEvent: (event: Omit<Event, 'id'>) => void;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  toggleEventComplete: (id: string) => void;
  
  // Scheduling actions
  scheduleTask: (taskId: string) => void;
  rescheduleAllTasks: () => void;
  dynamicReschedule: () => void;
  setAutoReschedule: (enabled: boolean) => void;
  generateSmartSchedule: (startDate: Date, endDate: Date) => void;
  updateEnergyPattern: (hour: number, energyLevel: number) => void;
  updateSchedulerConfig: (config: Partial<ScheduleStore['schedulerConfig']>) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateSettings: (settings: Partial<ScheduleStore['settings']>) => void;
  
  // Backup/Restore
  restoreFromBackup: (data: {
    tasks: Task[];
    courses: Course[];
    settings?: any;
    timeBlocks: TimeBlock[];
    preferences: UserPreferences;
  }) => void;
  
  // Queries
  getTasksForDate: (date: Date) => Task[];
  getUpcomingTasks: (days: number) => Task[];
  getTasksByCourse: (courseId: string) => Task[];
}

const defaultPreferences: UserPreferences = {
  studyHours: { start: '09:00', end: '22:00' },
  breakDuration: 15,
  sessionDuration: 120,
  complexityDefaults: {
    assignment: 3,
    exam: 2.5,
    project: 4,
    reading: 2,
    lab: 3
  },
  bufferDefaults: {
    soft: 20,
    hard: 10
  },
  energyLevels: {
    9: 0.7, 10: 0.9, 11: 1.0, 12: 0.8, 13: 0.6,
    14: 0.7, 15: 0.8, 16: 0.9, 17: 0.8, 18: 0.7,
    19: 0.8, 20: 0.7, 21: 0.6, 22: 0.5
  },
  studySessionDuration: 120,
  maxDailyStudyHours: 8,
  preferredStudyTimes: {
    morning: false,
    afternoon: true,
    evening: true,
    night: false,
  },
  daysBeforeExam: 7,
  daysBeforeAssignment: 3,
  daysBeforeProject: 10,
  daysBeforeReading: 2,
  daysBeforeLab: 3,
  hoursPerWorkDay: 3,
  defaultHoursPerType: {
    assignment: 3,
    exam: 8,
    project: 10,
    reading: 2,
    lab: 4
  },
  complexityMultipliers: {
    1: 0.5,  // ⭐ Very Easy - quick review, -50% time
    2: 0.75, // ⭐⭐ Easy - familiar material, -25% time  
    3: 1.0,  // ⭐⭐⭐ Medium - standard difficulty, no adjustment (BASE TIME)
    4: 1.5,  // ⭐⭐⭐⭐ Hard - complex/unfamiliar, +50% time
    5: 2.0   // ⭐⭐⭐⭐⭐ Very Hard - many parts/very complex, +100% time
  }
};

// Helper to ensure task data integrity
const ensureTaskIntegrity = (task: any): Task => {
  return {
    ...task,
    scheduledBlocks: Array.isArray(task.scheduledBlocks) ? task.scheduledBlocks : [],
    dueDate: task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate),
    bufferPercentage: task.bufferPercentage || 20,
    status: task.status || 'not-started'
  };
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      courses: [],
      tasks: [],
      timeBlocks: [],
      events: [],
      preferences: defaultPreferences,
      settings: {
        googleBackupEnabled: false,
        autoBackupInterval: 30,
        lastBackupTime: undefined
      },
      autoRescheduleEnabled: true,
      dynamicScheduler: null,
      energyPatterns: [],
      schedulerConfig: {
        dailyStudyHours: { min: 2, max: 8, preferred: 4 },
        breakDuration: { short: 5, long: 20 },
        sessionDuration: { min: 25, max: 90, preferred: 50 }
      },
      
      // Course actions
      addCourse: (course) => {
        const newCourse = { ...course, id: uuidv4() };
        set((state) => ({
          courses: [...state.courses, newCourse],
        }));
        
        // Generate lecture events if course has schedule
        if (course.schedule && course.schedule.length > 0) {
          const courseWithId = { ...newCourse };
          generateLectureEventsForCourse(courseWithId, get, set);
        }
      },
      
      updateCourse: (id, course) => set((state) => ({
        courses: state.courses.map((c) => (c.id === id ? { ...c, ...course } : c)),
      })),
      
      deleteCourse: (id) => set((state) => ({
        courses: state.courses.filter((c) => c.id !== id),
        tasks: state.tasks.filter((t) => t.courseId !== id),
        events: state.events.filter((e) => e.courseId !== id),
      })),
      
      // Task actions
      addTask: (taskData) => {
        const taskId = uuidv4();
        const state = get();
        
        // Determine buffer days based on task type and preferences
        let bufferDays = 3; // default
        if (taskData.type === 'exam') {
          bufferDays = state.preferences.daysBeforeExam || 7;
        } else if (taskData.type === 'assignment') {
          bufferDays = state.preferences.daysBeforeAssignment || 3;
        } else if (taskData.type === 'project') {
          bufferDays = state.preferences.daysBeforeProject || 10;
        } else if (taskData.type === 'reading') {
          bufferDays = 2; // Less buffer for readings
        }
        
        // Create the task with all required fields
        const newTask: Task = { 
          ...taskData, 
          id: taskId, 
          bufferDays,
          scheduledBlocks: [],
          bufferPercentage: taskData.bufferPercentage || 20
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        
        // Create a deadline event (visual representation of DUE date)
        // Block should END at the due time, not start at it
        const deadlineEvent: Event = {
          id: uuidv4(),
          title: `DUE: ${taskData.title}`,
          type: 'deadline',
          courseId: taskData.courseId,
          startTime: new Date(taskData.dueDate.getTime() - 2 * 60 * 60 * 1000), // Start 2 hours before deadline (1hr work + 1hr buffer)
          endTime: new Date(taskData.dueDate.getTime() - 60 * 60 * 1000), // End 1 hour before deadline for upload buffer
          description: `Deadline for ${taskData.title}`,
          taskId: taskId,
        };
        
        set((state) => ({
          events: [...state.events, deadlineEvent],
        }));
        
        // Schedule DO blocks for the task (work time before deadline)
        if (taskData.estimatedHours && taskData.estimatedHours > 0) {
          get().scheduleTask(taskId);
        }
        
        // Schedule notifications for the new task
        const updatedState = get();
        notificationService.scheduleTaskNotifications(updatedState.tasks);
      },
      
      updateTask: (id, task) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...task } : t)),
        }));
        
        // Reschedule notifications after task update
        const updatedState = get();
        notificationService.scheduleTaskNotifications(updatedState.tasks);
        
        // Trigger dynamic rescheduling if enabled and task status changed to completed
        if (task.status === 'completed' && updatedState.autoRescheduleEnabled) {
          get().dynamicReschedule();
        }
      },
      
      completeTask: (id) => {
        const state = get();
        const task = state.tasks.find(t => t.id === id);
        
        if (!task) return;
        
        // Mark task as completed
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, status: 'completed' as const } : t
          ),
        }));
        
        // Trigger dynamic rescheduling if enabled
        if (state.autoRescheduleEnabled) {
          console.log(`✅ Task "${task.title}" completed. Triggering dynamic reschedule...`);
          get().dynamicReschedule();
        }
        
        // Update notifications
        const updatedState = get();
        notificationService.scheduleTaskNotifications(updatedState.tasks);
      },
      
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          timeBlocks: state.timeBlocks.filter((tb) => tb.taskId !== id),
          events: state.events.filter((e) => e.taskId !== id),
        }));
        
        // Reschedule notifications after task deletion
        const updatedState = get();
        notificationService.scheduleTaskNotifications(updatedState.tasks);
      },
      
      // TimeBlock actions
      addTimeBlock: (timeBlock) => set((state) => ({
        timeBlocks: [...state.timeBlocks, { ...timeBlock, id: uuidv4() }],
      })),
      
      updateTimeBlock: (id, timeBlock) => set((state) => ({
        timeBlocks: state.timeBlocks.map((tb) => (tb.id === id ? { ...tb, ...timeBlock } : tb)),
      })),
      
      deleteTimeBlock: (id) => set((state) => ({
        timeBlocks: state.timeBlocks.filter((tb) => tb.id !== id),
      })),
      
      toggleTimeBlockComplete: (id) => set((state) => ({
        timeBlocks: state.timeBlocks.map((tb) => 
          tb.id === id ? { ...tb, completed: !tb.completed } : tb
        ),
      })),
      
      // Event actions
      addEvent: (event) => {
        const state = get();
        
        // Check if this is an exam on a day that has lectures
        if (event.type === 'exam') {
          // Remove any lectures on the same day for the same course
          const examDate = startOfDay(event.startTime);
          const eventsToKeep = state.events.filter(e => {
            if (e.type === 'lecture' && e.courseId === event.courseId) {
              const eventDate = startOfDay(e.startTime);
              return !isSameDay(eventDate, examDate);
            }
            return true;
          });
          
          set({
            events: [...eventsToKeep, { ...event, id: uuidv4() }],
          });
        } else {
          set((state) => ({
            events: [...state.events, { ...event, id: uuidv4() }],
          }));
        }
      },
      
      updateEvent: (id, event) => set((state) => ({
        events: state.events.map((e) => (e.id === id ? { ...e, ...event } : e)),
      })),
      
      deleteEvent: (id) => set((state) => ({
        events: state.events.filter((e) => e.id !== id),
      })),
      
      toggleEventComplete: (id) => set((state) => ({
        events: state.events.map((e) => 
          e.id === id ? { ...e, completed: !e.completed, completedAt: !e.completed ? new Date() : undefined } : e
        ),
      })),
      
      // Scheduling
      scheduleTask: (taskId) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task || !task.estimatedHours || task.estimatedHours === 0) {
          console.log(`Skipping scheduling for task ${taskId} - no estimated hours`);
          return;
        }
        
        console.log(`Scheduling task: ${task.title}, estimated hours: ${task.estimatedHours}, buffer days: ${task.bufferDays}`);
        console.log(`Task due date: ${task.dueDate}`);
        
        // Ensure dueDate is a proper Date object
        const ensureDate = (date: Date | string): Date => {
          return typeof date === 'string' ? new Date(date) : date;
        };
        
        const dueDate = ensureDate(task.dueDate);
        
        // Subtract 1 hour from due date for upload buffer
        const adjustedDueDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour buffer
        
        // Calculate soft deadline (when work should be completed)
        const softDeadline = subDays(adjustedDueDate, task.bufferDays || 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log(`Today: ${today.toISOString()}, Due: ${adjustedDueDate.toISOString()} (with 1hr buffer), Soft deadline: ${softDeadline.toISOString()}`);
        
        // Skip scheduling if the task is already past due
        if (isBefore(adjustedDueDate, today)) {
          console.log(`Task ${task.title} is past due, skipping scheduling`);
          return;
        }
        
        // Start date is either today or some days before soft deadline
        const idealStartDate = subDays(softDeadline, Math.ceil(task.estimatedHours / 2)); // Start early enough
        const startDate = isAfter(today, idealStartDate) ? today : idealStartDate;
        
        // If soft deadline is in the past but due date is in future, start today
        const effectiveStartDate = isAfter(today, softDeadline) ? today : startDate;
        const effectiveDeadline = isAfter(today, softDeadline) ? adjustedDueDate : softDeadline;
        
        // Calculate how many days we have to work
        const daysAvailable = Math.max(1, differenceInDays(effectiveDeadline, effectiveStartDate) + 1);
        const hoursPerDay = Math.min(
          task.estimatedHours / daysAvailable, 
          state.preferences.hoursPerWorkDay || state.preferences.maxDailyStudyHours || 3
        );
        
        console.log(`Days available: ${daysAvailable}, hours per day: ${hoursPerDay}`);
        
        // Create DO blocks (study/work time)
        let remainingHours = task.estimatedHours;
        let currentDate = new Date(effectiveStartDate);
        const newBlocks: TimeBlock[] = [];
        
        while (remainingHours > 0 && !isAfter(currentDate, effectiveDeadline)) {
          // Check if there are any events on this day that would conflict
          const dayEvents = state.events.filter(e => 
            isSameDay(ensureDate(e.startTime), currentDate)
          );
          
          // Skip days with all-day events (clinicals)
          if (dayEvents.some(e => e.type === 'clinical')) {
            currentDate = addDays(currentDate, 1);
            continue;
          }
          
          // Get all busy times for this day (lectures, labs, exams)
          const busyTimes = dayEvents.map(e => ({
            start: ensureDate(e.startTime).getHours() + ensureDate(e.startTime).getMinutes() / 60,
            end: ensureDate(e.endTime).getHours() + ensureDate(e.endTime).getMinutes() / 60,
            type: e.type
          }));
          
          const hoursToday = Math.min(remainingHours, hoursPerDay);
          
          // Skip if less than 30 minutes remaining
          if (hoursToday < 0.5) {
            break;
          }
          
          // Find best time slot based on preferences and conflicts
          // Parse study hours from preferences (e.g., "09:00" -> 9)
          const studyStartHour = parseInt(state.preferences.studyHours?.start?.split(':')[0] || '9');
          const studyEndHour = parseInt(state.preferences.studyHours?.end?.split(':')[0] || '22');
          
          let startHour = studyStartHour + 5; // Default to mid-day
          
          // Distribute study blocks throughout the day
          const blocksToday = newBlocks.filter(b => {
            const blockDate = new Date(b.startTime);
            return blockDate.toDateString() === currentDate.toDateString();
          }).length;
          
          // Find available time slots that don't conflict with classes/events or existing blocks
          const findAvailableStartTime = (preferredHour: number, duration: number): number => {
            let testHour = preferredHour;
            const minimumGap = 0.25; // 15-minute gap between tasks
            
            // Get all existing blocks for the same date
            const existingBlocksToday = [...state.timeBlocks, ...newBlocks].filter(block => {
              const blockDate = new Date(block.startTime);
              return blockDate.toDateString() === currentDate.toDateString();
            });
            
            // Check if the preferred time conflicts with any busy periods or existing blocks
            while (testHour < studyEndHour - duration) {
              const testEnd = testHour + duration;
              
              // Check busy times (classes/events)
              const hasBusyConflict = busyTimes.some(busy => 
                (testHour >= busy.start && testHour < busy.end) || 
                (testEnd > busy.start && testEnd <= busy.end) || 
                (testHour <= busy.start && testEnd >= busy.end)
              );
              
              // Check existing blocks with minimum gap
              const hasBlockConflict = existingBlocksToday.some(block => {
                const blockStart = ensureDate(block.startTime);
                const blockEnd = ensureDate(block.endTime);
                const blockStartHour = blockStart.getHours() + blockStart.getMinutes() / 60;
                const blockEndHour = blockEnd.getHours() + blockEnd.getMinutes() / 60;
                
                return (
                  (testHour >= (blockStartHour - minimumGap) && testHour < (blockEndHour + minimumGap)) ||
                  (testEnd > (blockStartHour - minimumGap) && testEnd <= (blockEndHour + minimumGap)) ||
                  (testHour <= (blockStartHour - minimumGap) && testEnd >= (blockEndHour + minimumGap))
                );
              });
              
              if (!hasBusyConflict && !hasBlockConflict) {
                return testHour;
              }
              
              // Try next 15-minute slot
              testHour += 0.25;
            }
            
            // If no time found in preferred hours, try earlier or later
            if (testHour >= studyEndHour - duration) {
              // Try earlier in the day
              testHour = studyStartHour;
              while (testHour < preferredHour) {
                const testEnd = testHour + duration;
                
                const hasBusyConflict = busyTimes.some(busy => 
                  (testHour >= busy.start && testHour < busy.end) || 
                  (testEnd > busy.start && testEnd <= busy.end) || 
                  (testHour <= busy.start && testEnd >= busy.end)
                );
                
                const hasBlockConflict = existingBlocksToday.some(block => {
                  const blockStart = ensureDate(block.startTime);
                  const blockEnd = ensureDate(block.endTime);
                  const blockStartHour = blockStart.getHours() + blockStart.getMinutes() / 60;
                  const blockEndHour = blockEnd.getHours() + blockEnd.getMinutes() / 60;
                  
                  return (
                    (testHour >= (blockStartHour - minimumGap) && testHour < (blockEndHour + minimumGap)) ||
                    (testEnd > (blockStartHour - minimumGap) && testEnd <= (blockEndHour + minimumGap)) ||
                    (testHour <= (blockStartHour - minimumGap) && testEnd >= (blockEndHour + minimumGap))
                  );
                });
                
                if (!hasBusyConflict && !hasBlockConflict) {
                  return testHour;
                }
                
                testHour += 0.25;
              }
            }
            
            // If still no time found, return the earliest available slot
            return studyStartHour;
          };
          
          // Determine preferred start time based on preferences and existing blocks
          let preferredStartHour = studyStartHour + 5; // Default mid-day
          
          if (blocksToday === 0) {
            // First block - check preferences
            if (state.preferences.preferredStudyTimes?.morning) {
              preferredStartHour = Math.max(studyStartHour, 9);
            } else if (state.preferences.preferredStudyTimes?.afternoon) {
              preferredStartHour = 14;
            } else if (state.preferences.preferredStudyTimes?.evening) {
              preferredStartHour = Math.min(19, studyEndHour - 3);
            }
          } else {
            // Subsequent blocks - try to distribute throughout the day
            const hoursAvailable = studyEndHour - studyStartHour;
            const interval = Math.floor(hoursAvailable / 4);
            preferredStartHour = Math.min(studyStartHour + ((blocksToday + 1) * interval), studyEndHour - 2);
          }
          
          // Find actual available start time that avoids conflicts
          startHour = findAvailableStartTime(preferredStartHour, Math.ceil(hoursToday));
          
          const blockStart = new Date(currentDate);
          blockStart.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
          
          const blockEnd = new Date(blockStart);
          // Ensure block doesn't extend past study hours or into busy times
          let endHour = Math.min(startHour + Math.ceil(hoursToday), studyEndHour);
          
          // Check if end time conflicts with any busy period
          const nextBusyTime = busyTimes.find(busy => busy.start > startHour && busy.start < endHour);
          if (nextBusyTime) {
            endHour = Math.min(endHour, nextBusyTime.start);
          }
          
          blockEnd.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);
          
          const newBlock: TimeBlock = {
            id: uuidv4(),
            taskId,
            startTime: blockStart,
            endTime: blockEnd,
            completed: false,
            type: task.type === 'reading' ? 'study' : 
                  task.type === 'exam' ? 'review' : 'work'
          };
          
          newBlocks.push(newBlock);
          
          remainingHours -= hoursToday;
          currentDate = addDays(currentDate, 1);
        }
        
        console.log(`Created ${newBlocks.length} DO blocks for task ${task.title}`);
        
        // Add all the new blocks
        set((state) => ({
          timeBlocks: [...state.timeBlocks, ...newBlocks]
        }));
      },
      
      rescheduleAllTasks: () => {
        const state = get();
        
        // Calculate task priority based on complexity and urgency
        const calculateTaskPriority = (task: Task): number => {
          const now = new Date();
          const dueDate = new Date(task.dueDate);
          const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Complexity score (0-1) based on estimated hours
          const maxHours = Math.max(...state.tasks.map(t => t.estimatedHours || 1));
          const complexityScore = (task.estimatedHours || 1) / maxHours;
          
          // Urgency score (0-1) - higher for tasks due sooner
          const maxDays = Math.max(...state.tasks.map(t => {
            const due = new Date(t.dueDate);
            return Math.max(0, Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }));
          const urgencyScore = maxDays > 0 ? 1 - (daysUntilDue / maxDays) : 1;
          
          // Combined priority: weight complexity (30%) and urgency (70%)
          const priority = (complexityScore * 0.3) + (urgencyScore * 0.7);
          
          console.log(`Task "${task.title}": complexity=${complexityScore.toFixed(2)}, urgency=${urgencyScore.toFixed(2)}, priority=${priority.toFixed(2)}`);
          return priority;
        };
        
        // Clear existing time blocks
        set({ timeBlocks: [] });
        
        // Sort tasks by priority (highest first) before scheduling
        const incompleteTasks = state.tasks
          .filter(task => task.status !== 'completed' && task.estimatedHours > 0)
          .map(task => ({ task, priority: calculateTaskPriority(task) }))
          .sort((a, b) => b.priority - a.priority) // Sort by priority descending
          .map(({ task }) => task);
        
        console.log(`🎯 Scheduling ${incompleteTasks.length} tasks by priority:`);
        incompleteTasks.forEach((task, index) => {
          console.log(`${index + 1}. ${task.title} (due: ${new Date(task.dueDate).toDateString()})`);
        });
        
        // Schedule tasks in priority order
        incompleteTasks.forEach(task => {
          console.log(`Rescheduling high-priority task: ${task.title}`);
          get().scheduleTask(task.id);
        });
      },
      
      dynamicReschedule: () => {
        const state = get();
        get().generateSmartSchedule(new Date(), addDays(new Date(), 14));
      },

      generateSmartSchedule: (startDate, endDate) => {
        const state = get();

        // Initialize new scheduler with config
        const scheduler = new DynamicScheduler({
          dailyStudyHours: state.schedulerConfig.dailyStudyHours,
          breakDuration: state.schedulerConfig.breakDuration,
          sessionDuration: state.schedulerConfig.sessionDuration,
          sleepSchedule: {
            bedtime: parseInt(state.preferences.studyHours?.end?.split(':')[0] || '23'),
            wakeTime: parseInt(state.preferences.studyHours?.start?.split(':')[0] || '7')
          }
        });

        // Update energy patterns if available
        if (state.energyPatterns.length > 0) {
          scheduler.updateEnergyPattern(state.energyPatterns);
        }

        // Convert tasks to scheduler format
        const schedulerTasks = state.tasks
          .filter(t => t.status !== 'completed' && t.estimatedHours > 0)
          .map(convertToSchedulerTask);

        // Convert existing events to busy slots
        const existingEvents = state.events.map(e => ({
          start: e.startTime instanceof Date ? e.startTime : new Date(e.startTime),
          end: e.endTime instanceof Date ? e.endTime : new Date(e.endTime)
        }));

        // Generate optimized schedule
        const studyBlocks = scheduler.generateSchedule(
          schedulerTasks,
          startDate,
          endDate,
          existingEvents
        );

        // Convert study blocks to time blocks
        const newTimeBlocks: TimeBlock[] = studyBlocks
          .map(block => ({
            id: block.id,
            taskId: block.taskId,
            startTime: block.startTime,
            endTime: block.endTime,
            completed: false,
            type: block.taskType === 'exam' ? 'review' :
                  block.taskType === 'reading' ? 'study' : 'work'
          }));

        // Keep manual blocks
        const manualBlocks = state.timeBlocks.filter(b => b.isManual === true);

        set({
          timeBlocks: [...manualBlocks, ...newTimeBlocks],
          dynamicScheduler: scheduler
        });

        console.log(`📅 Smart schedule generated: ${newTimeBlocks.length} study blocks created`);
      },

      updateEnergyPattern: (hour, energyLevel) => {
        set((state) => {
          const patterns = [...state.energyPatterns];
          const existingIndex = patterns.findIndex(p => p.hour === hour);

          if (existingIndex >= 0) {
            patterns[existingIndex] = {
              ...patterns[existingIndex],
              energyLevel,
              productivity: energyLevel * 0.9
            };
          } else {
            patterns.push({
              hour,
              energyLevel,
              productivity: energyLevel * 0.9
            });
          }

          // Update scheduler if it exists
          if (state.dynamicScheduler) {
            state.dynamicScheduler.updateEnergyPattern(patterns);
          }

          return { energyPatterns: patterns };
        });
      },

      updateSchedulerConfig: (config) => {
        set((state) => ({
          schedulerConfig: { ...state.schedulerConfig, ...config }
        }));
      },
      
      setAutoReschedule: (enabled) => {
        set({ autoRescheduleEnabled: enabled });
        console.log(`Auto-reschedule ${enabled ? 'enabled' : 'disabled'}`);
      },
      
      updatePreferences: (preferences) => set((state) => ({
        preferences: { ...state.preferences, ...preferences },
      })),
      
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings },
      })),
      
      // Backup/Restore
      restoreFromBackup: (data) => {
        set({
          tasks: data.tasks.map(ensureTaskIntegrity),
          courses: data.courses,
          timeBlocks: data.timeBlocks,
          preferences: { ...defaultPreferences, ...data.preferences },
          settings: data.settings || get().settings,
        });
        
        // Trigger reschedule after restore
        const state = get();
        if (state.autoRescheduleEnabled) {
          state.rescheduleAllTasks();
        }
      },
      
      // Queries
      getTasksForDate: (date) => {
        const { tasks } = get();
        return tasks.filter(task => {
          const taskDate = new Date(task.dueDate);
          return taskDate.toDateString() === date.toDateString();
        });
      },
      
      getUpcomingTasks: (days) => {
        const { tasks } = get();
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        return tasks.filter(task => {
          const taskDate = new Date(task.dueDate);
          return taskDate >= now && taskDate <= futureDate;
        });
      },
      
      getTasksByCourse: (courseId) => {
        const { tasks } = get();
        return tasks.filter(task => task.courseId === courseId);
      }
    }),
    {
      name: 'schedule-store',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Fix any corrupted task data during hydration
        if (persistedState && persistedState.tasks) {
          persistedState.tasks = persistedState.tasks.map((task: any) => ensureTaskIntegrity(task));
        }
        
        // Ensure all arrays exist
        persistedState.courses = persistedState.courses || [];
        persistedState.timeBlocks = persistedState.timeBlocks || [];
        persistedState.events = persistedState.events || [];
        persistedState.preferences = persistedState.preferences || defaultPreferences;
        
        return persistedState;
      },
    }
  )
);
