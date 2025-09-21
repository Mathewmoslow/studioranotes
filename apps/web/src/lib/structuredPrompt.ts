/**
 * OpenAI-recommended structured prompt for task extraction
 * Following the battle-tested hierarchy from OpenAI's best practices
 */

import { getDefaultHours as getTaskDefaultHours } from '../config/taskHours';

// JSON Schema for strict validation
export const TASK_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1 },
          type: { 
            type: "string", 
            enum: [
              "assignment", "exam", "quiz", "project", "reading", 
              "lab", "lecture", "clinical", "simulation", "tutorial",
              "video", "discussion", "prep", "vsim", "remediation"
            ]
          },
          dueDate: { 
            type: "string", 
            pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$"  // ISO 8601 with time
          },
          estimatedHours: { type: "number", minimum: 0.25, maximum: 24 },
          complexity: { type: "integer", minimum: 1, maximum: 5 },
          courseIdentifier: { type: "string" },
          description: { type: "string" },
          points: { type: "number" },
          location: { type: "string" },
          isRecurring: { type: "boolean" },
          requiresFocus: { type: "boolean" }
        },
        required: ["title", "type", "dueDate", "estimatedHours", "complexity"]
      }
    }
  },
  required: ["tasks"],
  additionalProperties: false
};

// System message with OpenAI's recommended hierarchy
export function getSystemPrompt(semesterContext: any): string {
  const classSchedule = semesterContext.classSchedule || {};

  return `You are an academic task parser specialized in Canvas course data extraction.

CRITICAL PARSING RULES:
1. Output ONLY valid JSON matching the exact schema. No text before/after the JSON.
2. Extract EVERY individual student action as a separate task - never combine or summarize.
3. DEDUPLICATION: When the same assignment appears multiple times (e.g., in both Assignments and Grades), include it ONCE.
4. Chapter ranges MUST expand: "Ch 10-20" = 11 separate reading tasks (Ch 10, Ch 11... Ch 20).
5. Weekly patterns MUST expand: "Quiz every Monday" = separate quiz for each Monday in semester.
6. Use ISO date format with time (YYYY-MM-DDTHH:MM:SS) for all dates.

WHAT COUNTS AS A TASK (each is separate):
- Assignments, submissions, quizzes, exams, projects/milestones
- Readings (each chapter/article = one task)
- Lectures/labs/clinicals (each occurrence = one task)
- Discussions, reflections, peer reviews, surveys
- Videos, simulations (vSims), tutorials
- Preparation work ("read before class", "watch before lab")
- Remediation assignments

EXPANSION RULES:
- Ranges → enumerate: "Ch. 10–20" → 11 reading tasks
- Lists/bundles → split: "Quiz 1, 2, 3" → 3 separate quiz tasks
- Multi-part items → separate: "Part A/B/C" → 3 tasks
- "Assignments 1-5" → 5 separate assignment tasks

RECURRENCE RULES:
- For weekly/biweekly patterns within date window, create one dated task per occurrence
- "Every Monday lecture" + semester dates → individual task for each Monday
- "Weekly quizzes" → one quiz task per week with specific dates
- Skip only explicitly mentioned holidays

DATE & TIME INFERENCE (Critical):
- Class schedule context: ${JSON.stringify(classSchedule)}
- "before class" → dueDate = class_date with time 1 hour before class_time
- "before Week N" → dueDate = week_N_first_class_date with time 1 hour before
- "by class time" → dueDate = class_date with exact class_time
- "after lecture" → dueDate = lecture_date with time 2 hours after lecture_end
- "before exam" → dueDate = exam_date with time 1 hour before exam_time
- Week N mapping: Week 1 starts ${semesterContext.startDate}
- Default time if unspecified: 23:59:00
- Times in 24-hour format (e.g., 09:35:00 for 9:35 AM)

EFFORT INFERENCE:
- Reading: ~4 min/page if pages given, else 1.5 hours per chapter
- Lectures/labs: use actual duration from schedule
- Assignments: 2-4 hours unless specified
- Exams: 2-4 hours prep time
- Projects: 5-10 hours depending on scope
- Videos: 1.5x the video length for notes
- Clinical: actual clinical hours
- Quizzes: 1-2 hours prep

COMPLEXITY SCORING:
1 = Trivial (attendance, short reading)
2 = Light (basic assignment, single chapter)
3 = Standard (typical homework, quiz)
4 = Challenging (exam, major assignment)
5 = Critical (final exam, capstone project)

COURSE/CONTEXT BINDING:
- ALWAYS set "courseIdentifier" to the selected course code (provided in context)
- The user has already specified which course this import is for
- Do NOT try to extract or guess course codes from the text
- Add clarifying details in "description" (room numbers, special instructions)
- Mark "isRecurring": true for repeated events
- Mark "requiresFocus": true for exams, major projects

VALIDATION CHECKLIST:
✓ Every task has: title, type, dueDate with time, estimatedHours, complexity
✓ dueDate uses ISO 8601: "2025-09-17T09:35:00"
✓ No duplicates or grouped items
✓ All ranges expanded to individual tasks
✓ Times account for "before class" context

JSON SCHEMA:
{
  "tasks": [
    {
      "title": "string - concise task name",
      "type": "assignment|exam|project|reading|lab|lecture|clinical|simulation|tutorial|quiz|video|discussion|prep",
      "dueDate": "YYYY-MM-DDTHH:MM:SS format",
      "estimatedHours": number,
      "complexity": 1-5,
      "courseIdentifier": "optional - course name/code if mentioned",
      "description": "optional - additional details",
      "points": "optional - point value if available"
    }
  ]
}

IMPORTANT: Output MUST be valid JSON only. Start with { and end with }`;
}

// Few-shot examples showing edge cases
export const FEW_SHOT_EXAMPLES = `
EXAMPLE A - Range expansion with time inference:
Input: "NURS330 Week 2: Read Chapters 10-12 before Wednesday's class"
Context: Wednesday class at 09:35
Output: {
  "tasks": [
    { "title": "Read Chapter 10", "type": "reading", "dueDate": "2025-09-10T08:35:00", "estimatedHours": 1.5, "complexity": 2, "courseIdentifier": "NURS330" },
    { "title": "Read Chapter 11", "type": "reading", "dueDate": "2025-09-10T08:35:00", "estimatedHours": 1.5, "complexity": 2, "courseIdentifier": "NURS330" },
    { "title": "Read Chapter 12", "type": "reading", "dueDate": "2025-09-10T08:35:00", "estimatedHours": 1.5, "complexity": 2, "courseIdentifier": "NURS330" }
  ]
}

EXAMPLE B - Recurring events with proper dates:
Input: "CS101 Lectures: Mondays 10:00-11:15 AM, Sept 2-16"
Output: {
  "tasks": [
    { "title": "Lecture", "type": "lecture", "dueDate": "2025-09-02T10:00:00", "estimatedHours": 1.25, "complexity": 1, "courseIdentifier": "CS101", "isRecurring": true },
    { "title": "Lecture", "type": "lecture", "dueDate": "2025-09-09T10:00:00", "estimatedHours": 1.25, "complexity": 1, "courseIdentifier": "CS101", "isRecurring": true },
    { "title": "Lecture", "type": "lecture", "dueDate": "2025-09-16T10:00:00", "estimatedHours": 1.25, "complexity": 1, "courseIdentifier": "CS101", "isRecurring": true }
  ]
}

EXAMPLE C - "Before exam" timing:
Input: "Complete practice problems before Exam 1 on Sept 17 at 9:35am"
Output: {
  "tasks": [
    { "title": "Complete practice problems", "type": "prep", "dueDate": "2025-09-17T08:35:00", "estimatedHours": 2, "complexity": 3, "description": "Preparation for Exam 1" },
    { "title": "Exam 1", "type": "exam", "dueDate": "2025-09-17T09:35:00", "estimatedHours": 2, "complexity": 4, "requiresFocus": true }
  ]
}`;

// User message template
export function getUserPrompt(canvasText: string, semesterContext: any): string {
  // Extract the first course's details (the selected course for this import)
  const selectedCourse: any = semesterContext.classSchedule ? Object.values(semesterContext.classSchedule)[0] : {};
  const courseInfo = selectedCourse?.courseCode ? 
    `${selectedCourse.courseCode} - ${selectedCourse.courseName}` : 
    semesterContext.courses || 'Course';
    
  return `INPUT_UNSTRUCTURED_TEXT:
${canvasText}

CONTEXT FOR THIS IMPORT:
- selectedCourse: ${courseInfo}
- semesterStartDate: ${semesterContext.startDate}
- semesterEndDate: ${semesterContext.endDate}
- currentDate: ${new Date().toISOString().split('T')[0]}
- timezone: America/New_York
- classSchedule: ${JSON.stringify(semesterContext.classSchedule || {})}
- totalWeeks: ${semesterContext.totalWeeks || 16}

IMPORTANT:
- This import is specifically for: ${courseInfo}
- All tasks should have courseIdentifier: "${selectedCourse?.courseCode || 'COURSE'}"
- Use the provided class schedule for "before class" timing calculations

TASK:
Extract every individual student action as atomic tasks following the rules above.
All tasks belong to the selected course: ${courseInfo}.
Ensure all "before class" deadlines use the actual class time minus 1 hour.

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON that starts with { and ends with }
- No markdown code blocks, no commentary, no explanations
- The response must be parseable by JSON.parse()
- Follow the exact schema provided above`;
}

// Response format for API call
export const RESPONSE_FORMAT = {
  type: "json_object" as const,
  // Note: When OpenAI enables json_schema with strict:true, update to:
  // type: "json_schema",
  // json_schema: {
  //   name: "task_extraction",
  //   strict: true,
  //   schema: TASK_EXTRACTION_SCHEMA
  // }
};

// API parameters for consistent extraction
export const API_PARAMS = {
  temperature: 0.1,  // Low randomness for consistency
  top_p: 1.0,
  seed: 12345,  // Reproducibility
  // No max_tokens limit - let model use what it needs
};