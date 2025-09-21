import { Course } from '@studioranotes/types';

interface ChunkResult {
  assignments: string[];
  modules: string[];
  syllabus: string;
  metadata: {
    totalAssignments: number;
    courseTitle?: string;
    instructor?: string;
  };
}

/**
 * Optimized chunking for 128k token limit (GPT-4o)
 * Only chunks when absolutely necessary (>50k chars per chunk)
 */
export function chunkCanvasData(text: string): ChunkResult {
  const MAX_CHUNK_SIZE = 50000; // ~12,500 tokens, well under 128k limit
  
  const lines = text.split('\n');
  const assignments: string[] = [];
  const modules: string[] = [];
  let syllabus = '';
  
  let assignmentsContent = '';
  let modulesContent = '';
  let syllabusContent = '';
  let unclassifiedContent = '';
  
  // Track what section we're in
  let currentSection: 'assignments' | 'modules' | 'syllabus' | 'unknown' = 'unknown';
  let assignmentCount = 0;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect section headers
    const isAssignmentSection = 
      lowerLine.includes('upcoming') && lowerLine.includes('assignment') ||
      lowerLine.includes('assignment') && (lowerLine.includes('page') || lowerLine.includes('list')) ||
      lowerLine === 'assignments' ||
      lowerLine.includes('homework') && lowerLine.includes('list') ||
      lowerLine.includes('all assignments');
    
    const isModulesSection = 
      lowerLine.includes('modules page') || 
      lowerLine.includes('module list') ||
      lowerLine.includes('weekly modules') ||
      lowerLine.includes('course modules');
    
    const isSyllabusSection = 
      lowerLine.includes('syllabus') || 
      lowerLine.includes('course schedule') ||
      lowerLine.includes('course outline');
    
    // Switch sections if header detected
    if (isAssignmentSection) {
      currentSection = 'assignments';
      assignmentsContent += line + '\n';
      continue;
    } else if (isModulesSection) {
      currentSection = 'modules';
      modulesContent += line + '\n';
      continue;
    } else if (isSyllabusSection) {
      currentSection = 'syllabus';
      syllabusContent += line + '\n';
      continue;
    }
    
    // Add content to appropriate section
    switch (currentSection) {
      case 'assignments':
        assignmentsContent += line + '\n';
        // Count assignments for metadata
        if (/^(assignment|quiz|exam|test|project|homework)\s/i.test(line.trim())) {
          assignmentCount++;
        }
        break;
      case 'modules':
        modulesContent += line + '\n';
        break;
      case 'syllabus':
        syllabusContent += line + '\n';
        break;
      default:
        unclassifiedContent += line + '\n';
    }
  }
  
  // Try to classify unclassified content
  if (unclassifiedContent) {
    // If it contains assignment indicators, add to assignments
    if (unclassifiedContent.match(/\b(due|assignment|quiz|exam|test|pts|points)\b/i)) {
      assignmentsContent = unclassifiedContent + assignmentsContent;
    } else if (unclassifiedContent.match(/\b(week \d+|module \d+)\b/i)) {
      modulesContent = unclassifiedContent + modulesContent;
    } else {
      syllabusContent = unclassifiedContent + syllabusContent;
    }
  }
  
  // Only chunk if content exceeds max size (50k chars)
  // This is rare - most Canvas exports are under 20k chars
  
  // Process assignments
  if (assignmentsContent.length > MAX_CHUNK_SIZE) {
    // Split into chunks at assignment boundaries
    const chunks = intelligentSplit(assignmentsContent, MAX_CHUNK_SIZE);
    assignments.push(...chunks);
  } else if (assignmentsContent.trim()) {
    assignments.push(assignmentsContent);
  }
  
  // Process modules
  if (modulesContent.length > MAX_CHUNK_SIZE) {
    // Split into chunks at module boundaries
    const chunks = intelligentSplit(modulesContent, MAX_CHUNK_SIZE);
    modules.push(...chunks);
  } else if (modulesContent.trim()) {
    modules.push(modulesContent);
  }
  
  // Syllabus typically doesn't need chunking
  syllabus = syllabusContent;
  
  return {
    assignments,
    modules,
    syllabus,
    metadata: {
      totalAssignments: assignmentCount,
      courseTitle: extractCourseTitle(text),
      instructor: extractInstructor(text)
    }
  };
}

/**
 * Intelligently split large content at natural boundaries
 * Only used when content > 50k chars
 */
function intelligentSplit(content: string, maxSize: number): string[] {
  if (content.length <= maxSize) return [content];
  
  const chunks: string[] = [];
  const lines = content.split('\n');
  let currentChunk = '';
  
  // Natural boundary patterns
  const boundaryPatterns = [
    /^assignment\s/i,
    /^quiz\s/i,
    /^exam\s/i,
    /^test\s/i,
    /^project\s/i,
    /^module \d+/i,
    /^week \d+/i,
    /^homework\s/i,
    /^-{3,}/, // Separator lines
  ];
  
  for (const line of lines) {
    // Check if this line is a natural boundary
    const isBoundary = boundaryPatterns.some(pattern => pattern.test(line.trim()));
    
    // If adding this line would exceed max size and we're at a boundary
    if (currentChunk.length + line.length > maxSize && isBoundary && currentChunk.length > 1000) {
      // Save current chunk
      chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
      
      // Force split if we're way over max size
      if (currentChunk.length > maxSize * 1.2) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
  }
  
  // Add remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

function extractCourseTitle(text: string): string | undefined {
  const titleMatch = text.match(/(?:Course:|NURS \d+|CS \d+|MATH \d+|Course Title:)\s*([^\n]+)/i);
  return titleMatch?.[1]?.trim();
}

function extractInstructor(text: string): string | undefined {
  const instructorMatch = text.match(/(?:Instructor:|Professor:|Dr\.|Prof\.)\s*([^\n]+)/i);
  return instructorMatch?.[1]?.trim();
}

/**
 * Combines parsed results from multiple chunks
 */
export function combineChunkResults(results: any[]): any[] {
  const allTasks: any[] = [];
  const seenTitles = new Set<string>();
  
  for (const result of results) {
    if (!result?.tasks) continue;
    
    for (const task of result.tasks) {
      // Deduplicate by title and due date
      const key = `${task.title}-${task.dueDate}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allTasks.push(task);
      }
    }
  }
  
  // Sort by due date
  return allTasks.sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
}

/**
 * Summarizes text to fit within token limits
 */
export function summarizeForTokens(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text;
  
  const lines = text.split('\n');
  const important: string[] = [];
  const regular: string[] = [];
  
  for (const line of lines) {
    // Prioritize lines with dates, assignments, due dates
    if (line.match(/\b(due|deadline|exam|quiz|assignment|project|test|midterm|final)\b/i) ||
        line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/) ||
        line.match(/\b\d{1,2}\/\d{1,2}\b/) ||
        line.match(/\bWeek \d+\b/i)) {
      important.push(line);
    } else {
      regular.push(line);
    }
  }
  
  // Build summary prioritizing important lines
  let summary = important.join('\n');
  
  // Add regular lines if there's space
  for (const line of regular) {
    if (summary.length + line.length + 1 < maxChars) {
      summary += '\n' + line;
    } else {
      break;
    }
  }
  
  return summary;
}