import { Course } from '@studioranotes/types';
import { mlTrainingService, ParsingResult } from './mlTrainingService';
import { patternEvolutionService } from './patternEvolutionService';
import { getDefaultHours as getTaskDefaultHours, getHoursGuidelinesForPrompt } from '../config/taskHours';
import { OPENAI_CONFIG } from '../config/openaiConfig';
import { useSemesterStore } from '../stores/semesterStore';
import { parseDate, extractWeekNumber } from '../utils/dateParser';
import { getSystemPrompt, getUserPrompt, RESPONSE_FORMAT } from './structuredPrompt';
import { cleanJSONResponse } from '../utils/jsonCleaner';

// Strict schema for AI response
interface AITaskResponse {
  tasks: Array<{
    title: string;
    type: 'assignment' | 'exam' | 'project' | 'reading' | 'lab' | 'lecture' | 'clinical' | 'simulation' | 'tutorial' | 'quiz' | 'video' | 'discussion' | 'vsim' | 'remediation' | 'admin' | 'prep' | 'drill';
    dueDate: string; // ISO date string
    estimatedHours: number;
    complexity: 1 | 2 | 3 | 4 | 5;
    courseIdentifier?: string; // Course name or code to match
    description?: string;
    points?: number; // Point value if available
    // Enhanced metadata
    difficulty?: 'easy' | 'medium' | 'hard';
    canSplit?: boolean;
    preferredTimes?: string[];
    priorityLevel?: 'critical' | 'high' | 'medium' | 'low';
    requiresFocus?: boolean;
    leadTime?: number;
    weekNumber?: number;
    moduleNumber?: number;
  }>;
}

// DEPRECATED: This hardcoded prompt is no longer used.
// We now use the structured prompt from structuredPrompt.ts (getSystemPrompt/getUserPrompt)
// Keeping for reference only - will be removed in future cleanup

// Get semester context for the parser
function getSemesterContext() {
  const semesterState = useSemesterStore.getState();
  const semester = semesterState.currentSemester;
  
  if (semester) {
    return {
      startDate: new Date(semester.startDate).toISOString().split('T')[0],
      endDate: new Date(semester.endDate).toISOString().split('T')[0],
      currentWeek: semesterState.getCurrentWeek(),
      totalWeeks: semester.totalWeeks
    };
  }
  
  // Fallback if no semester is set
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 4, 0);
  
  return {
    startDate: defaultStart.toISOString().split('T')[0],
    endDate: defaultEnd.toISOString().split('T')[0],
    currentWeek: 1,
    totalWeeks: 16
  };
}

// Token estimation (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimate: ~1 token per 4 characters
  return Math.ceil(text.length / 4);
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  // GPT-4o pricing: $5 per 1M input tokens, $15 per 1M output tokens
  const inputCost = (inputTokens / 1000000) * 5;
  const outputCost = (outputTokens / 1000000) * 15;
  return inputCost + outputCost;
}

// First stage: Extract relevant data only
async function extractRelevantData(text: string): Promise<string> {
  const EXTRACTION_PROMPT = `Extract ONLY assignment-related data from this Canvas course content. 
Output a condensed list with ONLY:
- Assignment names, due dates, point values
- Quiz names, dates, times, point values  
- Exam names, dates, times, point values
- Reading assignments (chapters, due dates)
- Project milestones and due dates
- Lab/clinical sessions with dates
- Any graded items with deadlines

EXCLUDE completely:
- Course descriptions and objectives
- Instructor information
- Policies and procedures  
- General announcements
- Discussion posts
- Navigation text
- Module descriptions
- Learning outcomes
- Syllabus narrative text
- Student rosters

Output format: Plain text list, one item per line with date and points if available.
Keep it concise - aim for under 5000 characters.`;

  // If text is already small enough, skip extraction
  if (text.length < 10000) {
    return text;
  }

  try {
    const apiUrl = import.meta.env.MODE === 'production' 
      ? '/api/openai'
      : 'http://localhost:3001/api/openai';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.warn('Extraction stage failed, using original text');
      return text;
    }

    const data = await response.json();
    const extracted = data.choices[0]?.message?.content || text;
    
    console.log(`📊 Extraction: ${text.length} chars → ${extracted.length} chars`);
    return extracted;
    
  } catch (error) {
    console.warn('Extraction failed, using original text:', error);
    return text;
  }
}

// Use the Assistant API for better consistency
async function parseWithAssistant(
  text: string,
  courses: Course[]
): Promise<ParsedTask[]> {
  const ASSISTANT_ID = 'asst_7sSwxn60AHQotZtg7oZQBm0S';
  
  try {
    const apiUrl = import.meta.env.MODE === 'production' 
      ? '/api/openai-assistant'
      : 'http://localhost:3001/api/openai-assistant';
    
    // Much simpler message - Assistant has all the instructions
    const userMessage = `Extract all tasks from this Canvas course data.

Available courses: ${courses.map(c => `${c.code} - ${c.name}`).join(', ')}
Semester dates: ${getSemesterContext().startDate} to ${getSemesterContext().endDate}
Today's date: ${new Date().toISOString().split('T')[0]}

CANVAS DATA:
${text}`;

    console.log(`🤖 Sending to Assistant (${text.length} chars)...`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    
    if (!response.ok) {
      let errorMessage = 'Assistant API failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        console.error('Assistant API error details:', errorData);
      } catch (e) {
        // If response isn't JSON, try text
        try {
          errorMessage = await response.text();
        } catch (textError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Validate we got content
    if (!data.content) {
      throw new Error('No content in assistant response');
    }
    
    const parsed = JSON.parse(data.content);
    
    console.log(`✅ Assistant parsed ${parsed.tasks?.length || 0} tasks`);
    
    if (data.usage) {
      console.log(`📊 Token usage: ${data.usage.total_tokens} tokens`);
    }
    
    return convertToInternalFormat(parsed as AITaskResponse, courses);
    
  } catch (error) {
    console.error('Assistant parsing failed:', error);
    throw error;
  }
}

export async function parseWithOpenAI(
  text: string, 
  courses: Course[],
  apiKey?: string
): Promise<ParsedTask[]> {
  const parseId = `parse_${Date.now()}`;
  const startTime = Date.now();
  
  // API key is now handled securely on the server side
  // The apiKey parameter is kept for backward compatibility but is no longer used
  if (apiKey) {
    console.warn('API key parameter is deprecated and ignored. The server now handles authentication securely.');
  }
  
  // Use full text - let AI contextually decide what to include
  let processedText = text;

  // Build semester context for structured prompt
  const semesterContext = {
    startDate: getSemesterContext().startDate,
    endDate: getSemesterContext().endDate,
    currentWeek: getSemesterContext().currentWeek,
    totalWeeks: getSemesterContext().totalWeeks,
    courses: courses.map(c => `${c.code} - ${c.name}`).join(', '),
    classSchedule: {} // Will be populated if courses have schedules
  };

  // Add class schedule from first course if available
  if (courses.length > 0 && courses[0].schedule) {
    const course = courses[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    course.schedule.forEach(event => {
      const dayName = dayNames[event.dayOfWeek];
      semesterContext.classSchedule[dayName] = {
        start: event.startTime,
        end: event.endTime,
        courseCode: course.code,
        courseName: course.name
      };
    });
  }

  // Get structured prompts
  const systemPrompt = getSystemPrompt(semesterContext);
  const userPrompt = getUserPrompt(processedText, semesterContext);

  // Estimate tokens and cost
  const inputText = systemPrompt + userPrompt;
  const estimatedInputTokens = estimateTokens(inputText);
  const maxOutputTokens = OPENAI_CONFIG.getMaxTokens();
  const estimatedCost = calculateCost(estimatedInputTokens, maxOutputTokens / 2);
  
  console.log(`📊 Token Estimation:`);
  console.log(`  Input: ~${estimatedInputTokens} tokens`);
  console.log(`  Max Output: ${maxOutputTokens} tokens`);
  console.log(`  Estimated Cost: $${estimatedCost.toFixed(4)}`);
  console.log(`  Original text: ${text.length} characters`);
  console.log(`  Number of courses: ${courses.length}`);
  
  try {
    // Use our secure API endpoint instead of calling OpenAI directly
    // In production, use relative path. In dev, use full localhost URL
    const apiUrl = import.meta.env.MODE === 'production' 
      ? '/api/openai'  // In production, Vercel will handle this
      : 'http://localhost:3001/api/openai'; // For local development (Vercel dev runs on 3001)
    
    // Add AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout (2 minutes)
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: OPENAI_CONFIG.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: OPENAI_CONFIG.temperature,
          top_p: OPENAI_CONFIG.top_p,
          seed: OPENAI_CONFIG.seed,
          max_tokens: maxOutputTokens,
          response_format: RESPONSE_FORMAT
        }),
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout after 120 seconds');
        throw new Error('Request timeout - the text might be too long. Try with less content.');
      }
      throw fetchError;
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to parse error as JSON first, then fall back to text
      let errorMessage = 'Unknown error';
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error?.message || errorJson.error || errorJson.message || response.statusText;
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || response.statusText;
        } catch {
          errorMessage = response.statusText || 'API request failed';
        }
      }
      
      console.error(`OpenAI API error (${response.status}):`, errorMessage);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Log the raw response for debugging
    console.log('🔍 OpenAI Response received');
    console.log(`  Response length: ${content?.length || 0} characters`);
    
    // Log actual token usage if available
    if (data.usage) {
      const actualCost = calculateCost(data.usage.prompt_tokens, data.usage.completion_tokens);
      console.log(`✅ Actual Token Usage:`);
      console.log(`  Input: ${data.usage.prompt_tokens} tokens`);
      console.log(`  Output: ${data.usage.completion_tokens} tokens`);
      console.log(`  Total: ${data.usage.total_tokens} tokens`);
      console.log(`  Actual Cost: $${actualCost.toFixed(4)}`);
    }

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the JSON response
    const parsed = parseAndValidateResponse(content);
    
    console.log(`📝 Parsed ${parsed.tasks.length} tasks from AI response`);
    
    // LOG THE FULL JSON FOR VERIFICATION
    console.log('🔍 FULL PARSED JSON:', JSON.stringify(parsed, null, 2));
    
    // Convert to our internal format
    const tasks = convertToInternalFormat(parsed, courses);
    
    console.log(`✅ Converted to ${tasks.length} internal tasks`);
    
    // Save successful parsing for ML training
    const parsingResult: ParsingResult = {
      id: parseId,
      timestamp: new Date(),
      originalText: text,
      aiParsedTasks: tasks,
      patterns: {
        datePatterns: extractPatterns(text, 'date'),
        taskIndicators: extractPatterns(text, 'task'),
        courseIdentifiers: extractPatterns(text, 'course')
      },
      success: true
    };
    
    await mlTrainingService.saveParsingResult(parsingResult);
    
    // Analyze patterns in background for continuous learning
    setTimeout(async () => {
      const patterns = mlTrainingService.getEvolvedPatterns();
      // Pattern performance analysis happens during parsing
      
      const report = mlTrainingService.generateLearningReport();
      console.log('🧠 ML Training Report:');
      console.log(`  Success Rate: ${(report.successRate * 100).toFixed(1)}%`);
      console.log(`  Total Parses: ${report.totalParses}`);
      console.log(`  Pattern Confidence:`, 
        patterns.slice(0, 3).map(p => `${p.type}: ${(p.confidence * 100).toFixed(1)}%`).join(', '));
    }, 2000);
    
    return tasks;

  } catch (error) {
    console.error('OpenAI parsing failed:', error);
    
    // Save failed parsing for learning
    const parsingResult: ParsingResult = {
      id: parseId,
      timestamp: new Date(),
      originalText: text,
      aiParsedTasks: [],
      patterns: {
        datePatterns: extractPatterns(text, 'date'),
        taskIndicators: extractPatterns(text, 'task'),
        courseIdentifiers: extractPatterns(text, 'course')
      },
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
    
    await mlTrainingService.saveParsingResult(parsingResult);
    
    // Try to learn from the failure
    setTimeout(async () => {
      const patterns = mlTrainingService.getEvolvedPatterns();
      await patternEvolutionService.evolvePatterns(text, null, patterns);
      console.log('🔧 Learning from parsing failure to improve future results');
    }, 2000);
    
    throw error;
  }
}

function parseAndValidateResponse(content: string): AITaskResponse {
  try {
    console.log('🔧 Parsing AI response...');
    
    // Clean the JSON response using utility
    const jsonStr = cleanJSONResponse(content);
    
    console.log('📝 Raw response (first 500 chars):', content.substring(0, 500));
    console.log('🧹 Cleaned response (first 500 chars):', jsonStr.substring(0, 500));

    const parsed = JSON.parse(jsonStr);
    
    console.log(`📋 JSON parsed successfully`);
    
    // Validate structure
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      console.error('❌ Invalid response structure: missing tasks array');
      throw new Error('Invalid response structure: missing tasks array');
    }
    
    console.log(`  Found ${parsed.tasks.length} tasks in JSON`);

    // Validate each task
    for (const task of parsed.tasks) {
      if (!task.title || !task.type || !task.dueDate) {
        throw new Error(`Invalid task: missing required fields`);
      }
      
      // Validate type
      const validTypes = ['assignment', 'exam', 'project', 'reading', 'lab', 'lecture', 'clinical', 'simulation', 'tutorial', 'quiz'];
      if (!validTypes.includes(task.type)) {
        task.type = 'assignment'; // Default fallback
      }
      
      // Validate complexity
      if (!task.complexity || task.complexity < 1 || task.complexity > 5) {
        task.complexity = 3; // Default middle complexity
      }
      
      // Ensure estimatedHours exists
      if (!task.estimatedHours || task.estimatedHours <= 0) {
        task.estimatedHours = getTaskDefaultHours(task.type);
      }
    }

    return parsed as AITaskResponse;

  } catch (error) {
    console.error('❌ Failed to parse AI response');
    console.error('  Error:', error.message);
    console.error('  Content preview:', content?.substring(0, 500));
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

// Removed - now using centralized config from taskHours.ts

interface ParsedTask {
  title: string;
  type: 'assignment' | 'exam' | 'project' | 'reading' | 'lab' | 'lecture' | 'clinical' | 'simulation' | 'tutorial' | 'quiz' | 'video' | 'discussion' | 'vsim' | 'remediation' | 'admin' | 'prep' | 'drill';
  courseId: string;
  dueDate: Date;
  complexity: 1 | 2 | 3 | 4 | 5;
  estimatedHours: number;
  isHardDeadline: boolean;
  bufferPercentage: number;
  status: 'not-started';
  description?: string;
}

function convertToInternalFormat(aiResponse: AITaskResponse, courses: Course[]): ParsedTask[] {
  return aiResponse.tasks.map(task => {
    // Match course (including clinical detection)
    let courseId = courses[0]?.id || 'default';
    if (task.courseIdentifier && courses.length > 0) {
      const matched = courses.find(c => 
        c.code.toLowerCase().includes(task.courseIdentifier!.toLowerCase()) ||
        c.name.toLowerCase().includes(task.courseIdentifier!.toLowerCase()) ||
        task.courseIdentifier!.toLowerCase().includes(c.code.toLowerCase()) ||
        task.courseIdentifier!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matched) {
        courseId = matched.id;
      }
    }
    
    // Add points to description if available
    let enhancedDescription = task.description || '';
    if (task.points) {
      enhancedDescription = enhancedDescription 
        ? `${enhancedDescription} (${task.points} points)`
        : `${task.points} points`;
    }

    // Parse date
    let dueDate: Date;
    try {
      dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new Error('Invalid date');
      }
      // Set time to 11:59 PM for assignments, quizzes, and projects
      if (['assignment', 'quiz', 'project'].includes(task.type)) {
        dueDate.setHours(23, 59, 0, 0);
      }
    } catch {
      // Fallback to 2 weeks from now
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      dueDate.setHours(23, 59, 0, 0);
    }

    return {
      title: task.title,
      type: task.type,
      courseId,
      dueDate,
      complexity: task.complexity,
      estimatedHours: Math.max(0.5, task.estimatedHours),
      isHardDeadline: task.type === 'exam' || task.title.toLowerCase().includes('final'),
      bufferPercentage: task.type === 'exam' ? 10 : 20,
      status: 'not-started',
      description: enhancedDescription
    };
  });
}

/**
 * Extract patterns from text for ML training
 */
function extractPatterns(text: string, type: 'date' | 'task' | 'course'): string[] {
  const patterns: string[] = [];
  
  switch (type) {
    case 'date':
      // Extract date-like patterns
      const dateRegex = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\w+\s+\d{1,2},?\s+\d{4}\b|\bdue:?\s*[^\n]+/gi;
      const dates = text.match(dateRegex);
      if (dates) patterns.push(...dates.slice(0, 5));
      break;
      
    case 'task':
      // Extract task indicators
      const taskRegex = /\b(assignment|homework|hw|quiz|exam|test|midterm|final|project|paper|essay|reading|chapter|lab|exercise|problem set)s?\b/gi;
      const tasks = text.match(taskRegex);
      if (tasks) patterns.push(...Array.from(new Set(tasks)).slice(0, 10));
      break;
      
    case 'course':
      // Extract course codes and names
      const courseRegex = /\b[A-Z]{2,4}[\s-]?\d{3,4}[A-Z]?\b|\b(NURS|CS|MATH|PHYS|CHEM|BIO|ENG|HIST)\b/g;
      const courses = text.match(courseRegex);
      if (courses) patterns.push(...Array.from(new Set(courses)).slice(0, 5));
      break;
  }
  
  return patterns;
}