import { Course } from '@studioranotes/types';
import { parse } from 'date-fns';
import * as chrono from 'chrono-node';

interface ParsedTask {
  title: string;
  type: 'assignment' | 'exam' | 'project' | 'reading' | 'lab';
  courseId: string;
  dueDate: Date;
  complexity: 1 | 2 | 3 | 4 | 5;
  estimatedHours: number;
  isHardDeadline: boolean;
  bufferPercentage: number;
  status: 'not-started';
  description?: string;
}

export function parseScheduleText(text: string, courses: Course[]): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  
  // Split text into lines or sentences
  const lines = text.split(/[\n\r]+/).filter(line => line.trim());
  
  for (const line of lines) {
    const task = parseTaskLine(line, courses);
    if (task) {
      tasks.push(task);
    }
  }
  
  // If no tasks found, try to parse as a continuous text
  if (tasks.length === 0) {
    const continuousTasks = parseContinuousText(text, courses);
    tasks.push(...continuousTasks);
  }
  
  return tasks;
}

function parseTaskLine(line: string, courses: Course[]): ParsedTask | null {
  // Skip empty lines or headers
  if (!line.trim() || line.length < 5) return null;
  
  // Try to extract date using chrono-node (natural language date parser)
  const parsedDate = chrono.parseDate(line);
  
  // If no date found, skip this line (might be a header or description)
  if (!parsedDate) {
    // Check for common date patterns that chrono might miss
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // MM/DD/YYYY or MM-DD-YYYY
      /(\w+)\s+(\d{1,2})(st|nd|rd|th)?,?\s+(\d{4})?/i,  // Month Day, Year
      /(due|by|before|on)\s+(\w+\s+\d{1,2})/i,  // Due Month Day
    ];
    
    let foundDate = false;
    for (const pattern of datePatterns) {
      if (pattern.test(line)) {
        foundDate = true;
        break;
      }
    }
    
    if (!foundDate) return null;
  }
  
  // Determine task type based on keywords
  const type = determineTaskType(line);
  
  // Extract title (remove date and type keywords)
  const title = extractTitle(line);
  
  // Match with course if possible
  const courseId = matchCourse(line, courses) || courses[0]?.id || 'default';
  
  // Estimate complexity and hours based on type and keywords
  const { complexity, estimatedHours } = estimateWorkload(line, type);
  
  // Set task properties based on type
  const isHardDeadline = type === 'exam' || line.toLowerCase().includes('final') || line.toLowerCase().includes('mandatory');
  const bufferPercentage = type === 'exam' ? 10 : 20;
  
  return {
    title,
    type,
    courseId,
    dueDate: parsedDate || getDefaultFutureDate(),
    complexity,
    estimatedHours,
    isHardDeadline,
    bufferPercentage,
    status: 'not-started',
    description: line
  };
}

function parseContinuousText(text: string, courses: Course[]): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  
  // Look for assignment patterns in continuous text
  const patterns = [
    // Assignment patterns
    /(?:assignment|homework|hw)[\s:#-]*([^,\n]+?)(?:due|by|before|deadline|submit)[\s:]*([^,\n]+)/gi,
    // Exam patterns
    /(?:exam|test|quiz|midterm|final)[\s:#-]*([^,\n]+?)(?:on|at|scheduled|date)[\s:]*([^,\n]+)/gi,
    // Project patterns
    /(?:project|presentation|paper|report)[\s:#-]*([^,\n]+?)(?:due|by|deadline|submit)[\s:]*([^,\n]+)/gi,
    // Reading patterns
    /(?:read|reading|chapter)[\s:#-]*([^,\n]+?)(?:by|before|for)[\s:]*([^,\n]+)/gi,
    // Generic due date pattern
    /([^,\n]+?)(?:is\s+)?(?:due|deadline|by|before)[\s:]+([^,\n]+)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, titlePart, datePart] = match;
      
      const parsedDate = chrono.parseDate(datePart);
      if (!parsedDate) continue;
      
      const type = determineTaskType(fullMatch);
      const title = titlePart.trim().replace(/[:\-\s]+$/, '');
      const courseId = matchCourse(fullMatch, courses) || courses[0]?.id || 'default';
      const { complexity, estimatedHours } = estimateWorkload(fullMatch, type);
      
      tasks.push({
        title: cleanTitle(title),
        type,
        courseId,
        dueDate: parsedDate,
        complexity,
        estimatedHours,
        isHardDeadline: type === 'exam',
        bufferPercentage: type === 'exam' ? 10 : 20,
        status: 'not-started',
        description: fullMatch.trim()
      });
    }
  }
  
  return tasks;
}

function determineTaskType(text: string): ParsedTask['type'] {
  const lower = text.toLowerCase();
  
  if (lower.includes('exam') || lower.includes('test') || lower.includes('quiz') || lower.includes('midterm') || lower.includes('final')) {
    return 'exam';
  }
  if (lower.includes('project') || lower.includes('presentation') || lower.includes('proposal')) {
    return 'project';
  }
  if (lower.includes('read') || lower.includes('chapter') || lower.includes('article') || lower.includes('textbook')) {
    return 'reading';
  }
  if (lower.includes('lab') || lower.includes('experiment') || lower.includes('practical')) {
    return 'lab';
  }
  
  return 'assignment';
}

function extractTitle(line: string): string {
  // Remove common prefixes and suffixes
  let title = line;
  
  // Remove date patterns
  title = title.replace(/(?:due|by|before|on|deadline)[\s:]*[\w\s,\d\-\/]+$/i, '');
  title = title.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '');
  title = title.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}/gi, '');
  
  // Remove type prefixes
  title = title.replace(/^(?:assignment|homework|hw|exam|test|quiz|project|reading|chapter|lab)[\s:#\-]*/i, '');
  
  // Clean up
  title = title.replace(/[:\-\s]+$/, '').trim();
  
  // If title is too short or empty, use a generic title
  if (!title || title.length < 3) {
    return 'Untitled Task';
  }
  
  return cleanTitle(title);
}

function cleanTitle(title: string): string {
  // Capitalize first letter of each word
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchCourse(text: string, courses: Course[]): string | null {
  const lower = text.toLowerCase();
  
  for (const course of courses) {
    // Check for course code
    if (lower.includes(course.code.toLowerCase())) {
      return course.id;
    }
    
    // Check for course name
    const courseName = course.name.toLowerCase();
    const nameWords = courseName.split(' ').filter(w => w.length > 3);
    
    for (const word of nameWords) {
      if (lower.includes(word)) {
        return course.id;
      }
    }
  }
  
  return null;
}

function estimateWorkload(text: string, type: ParsedTask['type']): { complexity: 1 | 2 | 3 | 4 | 5, estimatedHours: number } {
  const lower = text.toLowerCase();
  
  // Base estimates by type
  let complexity: 1 | 2 | 3 | 4 | 5 = 3;
  let estimatedHours = 2;
  
  switch (type) {
    case 'exam':
      complexity = 5;
      estimatedHours = 8;
      break;
    case 'project':
      complexity = 4;
      estimatedHours = 6;
      break;
    case 'lab':
      complexity = 3;
      estimatedHours = 3;
      break;
    case 'reading':
      complexity = 2;
      estimatedHours = 2;
      
      // Check for chapter count
      const chapterMatch = lower.match(/chapters?\s*(\d+)[\s\-]+(\d+)/);
      if (chapterMatch) {
        const count = parseInt(chapterMatch[2]) - parseInt(chapterMatch[1]) + 1;
        estimatedHours = count * 1.5;
      } else if (lower.match(/\d+\s*pages?/)) {
        const pagesMatch = lower.match(/(\d+)\s*pages?/);
        if (pagesMatch) {
          const pages = parseInt(pagesMatch[1]);
          estimatedHours = Math.ceil(pages / 20); // Assume 20 pages per hour
        }
      }
      break;
    case 'assignment':
      complexity = 3;
      estimatedHours = 3;
      break;
  }
  
  // Adjust based on keywords
  if (lower.includes('final') || lower.includes('comprehensive')) {
    complexity = Math.min(5, complexity + 1) as 1 | 2 | 3 | 4 | 5;
    estimatedHours *= 1.5;
  }
  
  if (lower.includes('group') || lower.includes('team')) {
    complexity = Math.min(5, complexity + 1) as 1 | 2 | 3 | 4 | 5;
    estimatedHours *= 1.2;
  }
  
  if (lower.includes('short') || lower.includes('brief') || lower.includes('quick')) {
    complexity = Math.max(1, complexity - 1) as 1 | 2 | 3 | 4 | 5;
    estimatedHours *= 0.5;
  }
  
  if (lower.includes('long') || lower.includes('extensive') || lower.includes('detailed')) {
    complexity = Math.min(5, complexity + 1) as 1 | 2 | 3 | 4 | 5;
    estimatedHours *= 1.5;
  }
  
  return {
    complexity,
    estimatedHours: Math.max(0.5, Math.round(estimatedHours * 2) / 2) // Round to nearest 0.5
  };
}

function getDefaultFutureDate(): Date {
  // Return a date 2 weeks from now as default
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
}