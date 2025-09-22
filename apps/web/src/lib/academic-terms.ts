/**
 * Academic Term Configuration
 * Supports both semester and trimester systems
 */

export type AcademicSystem = 'semester' | 'trimester';

export interface AcademicTerm {
  id: string;
  name: string;
  type: 'fall' | 'spring' | 'summer' | 'trimester1' | 'trimester2' | 'trimester3';
  startDate: Date;
  endDate: Date;
  weeks: number;
  system: AcademicSystem;
}

export interface AcademicYear {
  year: number;
  system: AcademicSystem;
  terms: AcademicTerm[];
}

// Advent Health University Trimester Configuration
export const ADVENT_HEALTH_TRIMESTERS = {
  system: 'trimester' as AcademicSystem,
  termsPerYear: 3,
  weeksPerTerm: 14,

  // 2025 Academic Year
  year2025: {
    year: 2025,
    system: 'trimester' as AcademicSystem,
    terms: [
      {
        id: 'trimester1-2025',
        name: 'Trimester 1 2025',
        type: 'trimester1' as const,
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-04-11'),
        weeks: 14,
        system: 'trimester' as AcademicSystem
      },
      {
        id: 'trimester2-2025',
        name: 'Trimester 2 2025',
        type: 'trimester2' as const,
        startDate: new Date('2025-05-05'),
        endDate: new Date('2025-08-08'),
        weeks: 14,
        system: 'trimester' as AcademicSystem
      },
      {
        id: 'trimester3-2025',
        name: 'Trimester 3 2025',
        type: 'trimester3' as const,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-05'),
        weeks: 14,
        system: 'trimester' as AcademicSystem
      }
    ]
  },

  // 2026 Academic Year (projected)
  year2026: {
    year: 2026,
    system: 'trimester' as AcademicSystem,
    terms: [
      {
        id: 'trimester1-2026',
        name: 'Trimester 1 2026',
        type: 'trimester1' as const,
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-04-10'),
        weeks: 14,
        system: 'trimester' as AcademicSystem
      },
      {
        id: 'trimester2-2026',
        name: 'Trimester 2 2026',
        type: 'trimester2' as const,
        startDate: new Date('2026-05-04'),
        endDate: new Date('2026-08-07'),
        weeks: 14,
        system: 'trimester' as AcademicSystem
      },
      {
        id: 'trimester3-2026',
        name: 'Trimester 3 2026',
        type: 'trimester3' as const,
        startDate: new Date('2026-08-31'),
        endDate: new Date('2026-12-04'),
        weeks: 14,
        system: 'trimester' as AcademicSystem
      }
    ]
  }
};

// Traditional Semester Configuration
export const TRADITIONAL_SEMESTERS = {
  system: 'semester' as AcademicSystem,
  termsPerYear: 2,
  weeksPerTerm: 16,

  year2025: {
    year: 2025,
    system: 'semester' as AcademicSystem,
    terms: [
      {
        id: 'spring-2025',
        name: 'Spring 2025',
        type: 'spring' as const,
        startDate: new Date('2025-01-13'),
        endDate: new Date('2025-05-09'),
        weeks: 16,
        system: 'semester' as AcademicSystem
      },
      {
        id: 'summer-2025',
        name: 'Summer 2025',
        type: 'summer' as const,
        startDate: new Date('2025-05-19'),
        endDate: new Date('2025-08-08'),
        weeks: 12,
        system: 'semester' as AcademicSystem
      },
      {
        id: 'fall-2025',
        name: 'Fall 2025',
        type: 'fall' as const,
        startDate: new Date('2025-08-25'),
        endDate: new Date('2025-12-12'),
        weeks: 16,
        system: 'semester' as AcademicSystem
      }
    ]
  }
};

// Helper functions
export function getCurrentTerm(system: AcademicSystem = 'trimester'): AcademicTerm | null {
  const today = new Date();
  const config = system === 'trimester' ? ADVENT_HEALTH_TRIMESTERS : TRADITIONAL_SEMESTERS;
  const currentYear = today.getFullYear();

  const yearConfig = config[`year${currentYear}`] as AcademicYear;
  if (!yearConfig) return null;

  return yearConfig.terms.find(term =>
    today >= term.startDate && today <= term.endDate
  ) || null;
}

export function getNextTerm(system: AcademicSystem = 'trimester'): AcademicTerm | null {
  const today = new Date();
  const config = system === 'trimester' ? ADVENT_HEALTH_TRIMESTERS : TRADITIONAL_SEMESTERS;
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;

  // Check current year terms
  const yearConfig = config[`year${currentYear}`] as AcademicYear;
  if (yearConfig) {
    const nextTerm = yearConfig.terms.find(term => term.startDate > today);
    if (nextTerm) return nextTerm;
  }

  // Check next year terms
  const nextYearConfig = config[`year${nextYear}`] as AcademicYear;
  if (nextYearConfig) {
    return nextYearConfig.terms[0];
  }

  return null;
}

export function getTermByDate(date: Date, system: AcademicSystem = 'trimester'): AcademicTerm | null {
  const config = system === 'trimester' ? ADVENT_HEALTH_TRIMESTERS : TRADITIONAL_SEMESTERS;
  const year = date.getFullYear();

  const yearConfig = config[`year${year}`] as AcademicYear;
  if (!yearConfig) return null;

  return yearConfig.terms.find(term =>
    date >= term.startDate && date <= term.endDate
  ) || null;
}

export function formatTermName(term: AcademicTerm): string {
  // Ensure startDate is a Date object
  const startDate = term.startDate instanceof Date
    ? term.startDate
    : new Date(term.startDate);

  if (term.system === 'trimester') {
    const trimesterNum = term.type.replace('trimester', '');
    return `Trimester ${trimesterNum} ${startDate.getFullYear()}`;
  }

  const termName = term.type.charAt(0).toUpperCase() + term.type.slice(1);
  return `${termName} ${startDate.getFullYear()}`;
}

// Convert old semester data to new term format
export function convertSemesterToTerm(semester: any): AcademicTerm {
  const system = semester.name.toLowerCase().includes('trimester') ? 'trimester' : 'semester';

  let type: AcademicTerm['type'] = 'spring';
  if (semester.name.toLowerCase().includes('fall')) type = 'fall';
  else if (semester.name.toLowerCase().includes('summer')) type = 'summer';
  else if (semester.name.toLowerCase().includes('trimester 1')) type = 'trimester1';
  else if (semester.name.toLowerCase().includes('trimester 2')) type = 'trimester2';
  else if (semester.name.toLowerCase().includes('trimester 3')) type = 'trimester3';

  return {
    id: semester.id,
    name: semester.name,
    type,
    startDate: new Date(semester.startDate),
    endDate: new Date(semester.endDate),
    weeks: semester.totalWeeks || 14,
    system
  };
}