import { useScheduleStore } from './useScheduleStore';
import { addDays, startOfDay, setHours, isBefore, isAfter, differenceInDays, isWeekend } from 'date-fns';
import { TimeBlock, Task } from '@studioranotes/types';
import { v4 as uuidv4 } from 'uuid';

export const autoScheduleTasks = () => {
  const state = useScheduleStore.getState();
  const { tasks, preferences, timeBlocks } = state;
  
  console.log('=== SIMPLIFIED AUTO-SCHEDULE ===');
  
  // Get user preferences with defaults
  const hoursPerWeekday = preferences.hoursPerWeekday || 3;
  const hoursPerWeekend = preferences.hoursPerWeekend || 5;
  const defaultBufferDays = preferences.defaultBufferDays || 3;
  const studyDays = preferences.studyDays || {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true
  };
  
  // Default hours per task type
  const defaultHours = {
    exam: preferences.defaultHoursPerType?.exam || 8,
    assignment: preferences.defaultHoursPerType?.assignment || 3,
    project: preferences.defaultHoursPerType?.project || 10,
    reading: preferences.defaultHoursPerType?.reading || 2,
    quiz: preferences.defaultHoursPerType?.quiz || 2,
    homework: preferences.defaultHoursPerType?.homework || 2,
    lab: preferences.defaultHoursPerType?.lab || 4,
    other: 3
  };
  
  // Filter tasks that need scheduling
  const incompleteTasks = tasks.filter(task => 
    task.status !== 'completed' && 
    task.dueDate &&
    !task.isScheduled
  );
  
  if (incompleteTasks.length === 0) {
    console.log('No tasks to schedule');
    return {
      tasksScheduled: 0,
      blocksCreated: 0
    };
  }
  
  // Clear existing auto-generated blocks
  const manualBlocks = timeBlocks.filter(block => block.isManual === true);
  
  // Sort tasks by due date
  const sortedTasks = [...incompleteTasks].sort((a, b) => 
    new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  );
  
  const newBlocks: TimeBlock[] = [];
  const today = startOfDay(new Date());
  
  sortedTasks.forEach(task => {
    // Determine task type and get default hours if not set
    const taskType = detectTaskType(task);
    const totalHours = task.estimatedHours || defaultHours[taskType] || 3;
    
    // Calculate target completion date (due date minus buffer)
    const dueDate = new Date(task.dueDate!);
    const bufferDays = getBufferDaysForType(taskType, defaultBufferDays);
    const targetDate = addDays(dueDate, -bufferDays);
    
    // Calculate available days
    const startDate = isAfter(today, targetDate) ? today : today;
    const daysAvailable = Math.max(1, differenceInDays(targetDate, startDate));
    
    // Distribute hours across available days
    let remainingHours = totalHours;
    let currentDate = startDate;
    let blocksForTask = 0;
    
    while (remainingHours > 0 && isBefore(currentDate, dueDate)) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Skip if not a study day
      if (!studyDays[dayName]) {
        currentDate = addDays(currentDate, 1);
        continue;
      }
      
      // Determine daily hours based on weekday/weekend
      const dailyHours = isWeekend(currentDate) ? hoursPerWeekend : hoursPerWeekday;
      const hoursToSchedule = Math.min(remainingHours, dailyHours);
      
      if (hoursToSchedule > 0) {
        // Create a study block for this day
        // Distribute blocks across different times of day
        const blocksForDay = newBlocks.filter(b => {
          const blockDate = new Date(b.startTime);
          return blockDate.toDateString() === currentDate.toDateString();
        }).length;
        
        // Vary start times: 9am, 2pm, 7pm pattern
        let startHour = 14; // Default afternoon
        if (blocksForDay === 0) {
          startHour = 9; // Morning
        } else if (blocksForDay === 1) {
          startHour = 14; // Afternoon
        } else if (blocksForDay === 2) {
          startHour = 19; // Evening
        } else {
          startHour = 10 + (blocksForDay * 2); // Spread out additional blocks
        }
        
        const blockStartTime = setHours(currentDate, startHour);
        const blockEndTime = new Date(blockStartTime.getTime() + hoursToSchedule * 60 * 60 * 1000);
        
        const block: TimeBlock = {
          id: uuidv4(),
          taskId: task.id,
          type: 'do',
          startTime: blockStartTime.toISOString(),
          endTime: blockEndTime.toISOString(),
          duration: hoursToSchedule,
          isManual: false
        };
        
        newBlocks.push(block);
        remainingHours -= hoursToSchedule;
        blocksForTask++;
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    // Mark task as scheduled
    task.isScheduled = true;
  });
  
  // Update store with new blocks
  useScheduleStore.setState({
    timeBlocks: [...manualBlocks, ...newBlocks],
    tasks: tasks
  });
  
  console.log(`Created ${newBlocks.length} study blocks for ${sortedTasks.length} tasks`);
  
  return {
    tasksScheduled: sortedTasks.length,
    blocksCreated: newBlocks.length
  };
};

// Helper function to detect task type from title and description
function detectTaskType(task: Task): string {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  
  if (text.includes('exam') || text.includes('test') || text.includes('midterm') || text.includes('final')) {
    return 'exam';
  }
  if (text.includes('quiz')) {
    return 'quiz';
  }
  if (text.includes('project') || text.includes('presentation')) {
    return 'project';
  }
  if (text.includes('read') || text.includes('chapter')) {
    return 'reading';
  }
  if (text.includes('homework') || text.includes('hw')) {
    return 'homework';
  }
  if (text.includes('lab')) {
    return 'lab';
  }
  if (text.includes('assignment') || text.includes('problem set')) {
    return 'assignment';
  }
  
  return 'other';
}

// Helper function to get buffer days based on task type
function getBufferDaysForType(taskType: string, defaultBuffer: number): number {
  const buffers = {
    exam: 7,
    project: 5,
    assignment: 3,
    lab: 3,
    homework: 2,
    quiz: 2,
    reading: 1,
    other: defaultBuffer
  };
  
  return buffers[taskType] || defaultBuffer;
}