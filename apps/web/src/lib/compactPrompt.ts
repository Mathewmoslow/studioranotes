// Compact, optimized prompts for efficient API usage

export const COMPACT_SYSTEM_PROMPT = `Extract academic tasks from Canvas data as JSON.

Rules:
- Output valid JSON only
- One task per assignment/reading/exam
- Expand ranges: "Ch 1-3" = 3 tasks
- ISO dates (YYYY-MM-DD)

Types: assignment, quiz, exam, project, reading, lab, lecture, clinical, simulation

Required fields: title, type, dueDate, estimatedHours (1-5), complexity (1-5)

Example:
{"tasks":[{"title":"Read Chapter 1","type":"reading","dueDate":"2025-09-14","estimatedHours":2,"complexity":2}]}`;

export const CHUNK_PROMPT = `Extract tasks from this section. JSON only:`;

// For smaller token usage when processing chunks
export function getMinimalPrompt(chunkType: 'assignments' | 'modules' | 'syllabus'): string {
  switch(chunkType) {
    case 'assignments':
      return 'Extract all assignments with due dates. JSON only:';
    case 'modules':
      return 'Extract module tasks and readings. JSON only:';
    case 'syllabus':
      return 'Extract key dates and deliverables. JSON only:';
    default:
      return CHUNK_PROMPT;
  }
}