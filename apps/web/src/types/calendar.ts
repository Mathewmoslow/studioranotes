// Calendar block types and constants

export type CalendarBlockType =
  | 'lecture'
  | 'lab'
  | 'exam'
  | 'quiz'
  | 'assignment'
  | 'project'
  | 'study'
  | 'review'
  | 'due'
  | 'do'
  | 'break'
  | 'other';

export interface CalendarBlock {
  id: string;
  title: string;
  description?: string;
  type: CalendarBlockType;
  startTime: Date;
  endTime: Date;
  courseId?: string;
  location?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  isDraggable?: boolean;
  isManual?: boolean;
  color?: string;
  textColor?: string;
}

export const CALENDAR_BLOCK_COLORS: Record<CalendarBlockType, {
  background: string;
  text: string;
  border: string;
}> = {
  lecture: { background: '#e3f2fd', text: '#1565c0', border: '#1976d2' },
  lab: { background: '#f3e5f5', text: '#7b1fa2', border: '#8e24aa' },
  exam: { background: '#ffebee', text: '#c62828', border: '#d32f2f' },
  quiz: { background: '#fff3e0', text: '#ef6c00', border: '#f57c00' },
  assignment: { background: '#e8f5e8', text: '#2e7d32', border: '#388e3c' },
  project: { background: '#e1f5fe', text: '#0277bd', border: '#0288d1' },
  study: { background: '#f9fbe7', text: '#689f38', border: '#7cb342' },
  review: { background: '#fce4ec', text: '#ad1457', border: '#c2185b' },
  due: { background: '#ffebee', text: '#c62828', border: '#d32f2f' },
  do: { background: '#e8f5e8', text: '#2e7d32', border: '#388e3c' },
  break: { background: '#f5f5f5', text: '#616161', border: '#757575' },
  other: { background: '#f3e5f5', text: '#7b1fa2', border: '#8e24aa' }
};

export const BLOCK_TYPE_LABELS: Record<CalendarBlockType, string> = {
  lecture: 'Lecture',
  lab: 'Lab',
  exam: 'Exam',
  quiz: 'Quiz',
  assignment: 'Assignment',
  project: 'Project',
  study: 'Study Block',
  review: 'Review Session',
  due: 'Due Date',
  do: 'Task',
  break: 'Break',
  other: 'Other'
};