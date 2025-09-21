import { Task } from '@studioranotes/types';
import { v4 as uuidv4 } from 'uuid';
import { parse as parseDate } from 'date-fns';

/**
 * Enhanced Canvas data parser that handles multiple formats
 * and can merge additional context into existing tasks
 */
export async function parseCanvasData(
  text: string, 
  courseId: string
): Promise<Task[]> {
  const tasks: Task[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Pattern matching for different Canvas formats
  const patterns = {
    // Assignment with due date: "Assignment Name due Oct 25 at 11:59pm"
    assignment: /^(.+?)\s+due\s+(\w+\s+\d{1,2}(?:\s+at\s+\d{1,2}:\d{2}[ap]m)?)/i,
    
    // Module item: "Module 5: Topic Name"
    module: /^Module\s+\d+:\s+(.+)/i,
    
    // Points format: "Assignment (100 points)"
    points: /^(.+?)\s+\((\d+)\s+points?\)/i,
    
    // Date patterns
    datePattern: /(\w+\s+\d{1,2}(?:,?\s+\d{4})?(?:\s+at\s+\d{1,2}:\d{2}[ap]m)?)/i,
    
    // Sub-task pattern: "Part 1:", "Step 1:", etc.
    subtask: /^(?:Part|Step|Section)\s+(\d+)[:\s]+(.+)/i
  };
  
  let currentTask: Partial<Task> | null = null;
  let inSubtasks = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for assignment pattern
    const assignmentMatch = trimmed.match(patterns.assignment);
    if (assignmentMatch && assignmentMatch[1] && assignmentMatch[2]) {
      if (currentTask) {
        tasks.push(createTask(currentTask, courseId));
      }
      
      currentTask = {
        title: assignmentMatch[1].trim(),
        dueDate: parseCanvasDate(assignmentMatch[2]),
        type: 'assignment'
      };
      continue;
    }
    
    // Check for points pattern
    const pointsMatch = trimmed.match(patterns.points);
    if (pointsMatch && pointsMatch[1] && pointsMatch[2]) {
      const points = parseInt(pointsMatch[2]);
      const taskType = getTaskTypeFromPoints(points);
      
      if (currentTask) {
        tasks.push(createTask(currentTask, courseId));
      }
      
      currentTask = {
        title: pointsMatch[1].trim(),
        type: taskType,
        estimatedHours: estimateHoursFromPoints(points)
      };
      continue;
    }
    
    // Check for subtask pattern
    const subtaskMatch = trimmed.match(patterns.subtask);
    if (subtaskMatch && currentTask) {
      inSubtasks = true;
      const subtaskTitle = `${currentTask.title} - Part ${subtaskMatch[1]}`;
      const subtaskDesc = subtaskMatch[2].trim();
      
      // Look for date in subtask description
      const dateMatch = subtaskDesc.match(patterns.datePattern);
      
      tasks.push(createTask({
        title: subtaskTitle,
        description: subtaskDesc,
        type: currentTask.type || 'assignment',
        dueDate: dateMatch ? parseCanvasDate(dateMatch[1]) : currentTask.dueDate,
        // parentId: currentTask.id // TODO: Add parent-child relationship support
      }, courseId));
      continue;
    }
    
    // Check for standalone date
    const dateMatch = trimmed.match(patterns.datePattern);
    if (dateMatch && currentTask && !currentTask.dueDate) {
      currentTask.dueDate = parseCanvasDate(dateMatch[1]);
      continue;
    }
    
    // If we have a current task and this looks like description
    if (currentTask && trimmed.length > 20 && !trimmed.match(/^[A-Z]/)) {
      currentTask.description = (currentTask.description || '') + '\n' + trimmed;
      continue;
    }
    
    // Default: treat as a new task title
    if (trimmed.length > 0 && trimmed.match(/^[A-Z]/)) {
      if (currentTask) {
        tasks.push(createTask(currentTask, courseId));
      }
      
      currentTask = {
        title: trimmed,
        type: guessTaskType(trimmed)
      };
    }
  }
  
  // Don't forget the last task
  if (currentTask) {
    tasks.push(createTask(currentTask, courseId));
  }
  
  return tasks;
}

function createTask(partial: Partial<Task>, courseId: string): Task {
  return {
    id: uuidv4(),
    title: partial.title || 'Untitled Task',
    type: partial.type || 'assignment',
    courseId,
    dueDate: partial.dueDate || getDefaultDueDate(),
    complexity: 3,
    estimatedHours: partial.estimatedHours || estimateHours(partial.type || 'assignment'),
    isHardDeadline: true,
    scheduledBlocks: [],
    status: 'not-started',
    description: partial.description,
    materials: [],
    dependencies: []
  };
}

function parseCanvasDate(dateStr: string): Date {
  // Handle various Canvas date formats
  const cleanDate = dateStr
    .replace(/\s+at\s+/, ' ')
    .replace(/([ap]m)/, ' $1');
  
  // Try different date formats
  const formats = [
    'MMM d yyyy h:mm a',
    'MMM d h:mm a',
    'MMMM d yyyy h:mm a',
    'MMMM d h:mm a',
    'MMM d yyyy',
    'MMM d',
    'MMMM d yyyy',
    'MMMM d'
  ];
  
  for (const format of formats) {
    try {
      const parsed = parseDate(cleanDate, format, new Date());
      if (!isNaN(parsed.getTime())) {
        // If no year specified, assume current year or next year
        if (!dateStr.includes('202')) {
          const now = new Date();
          parsed.setFullYear(now.getFullYear());
          if (parsed < now) {
            parsed.setFullYear(now.getFullYear() + 1);
          }
        }
        return parsed;
      }
    } catch (e) {
      // Try next format
    }
  }
  
  // Fallback: 2 weeks from now
  return getDefaultDueDate();
}

function getDefaultDueDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
}

function guessTaskType(title: string): Task['type'] {
  const lower = title.toLowerCase();
  
  if (lower.includes('exam') || lower.includes('test') || lower.includes('midterm') || lower.includes('final')) {
    return 'exam';
  }
  if (lower.includes('project') || lower.includes('presentation')) {
    return 'project';
  }
  if (lower.includes('lab')) {
    return 'lab';
  }
  if (lower.includes('read') || lower.includes('chapter')) {
    return 'reading';
  }
  
  return 'assignment';
}

function getTaskTypeFromPoints(points: number): Task['type'] {
  if (points >= 100) return 'exam';
  if (points >= 50) return 'project';
  return 'assignment';
}

function estimateHoursFromPoints(points: number): number {
  if (points >= 100) return 8;
  if (points >= 50) return 5;
  if (points >= 25) return 3;
  return 2;
}

function estimateHours(type: Task['type']): number {
  switch (type) {
    case 'exam': return 8;
    case 'project': return 10;
    case 'lab': return 4;
    case 'reading': return 2;
    default: return 3;
  }
}