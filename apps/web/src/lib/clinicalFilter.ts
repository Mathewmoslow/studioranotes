// Clinical class calendar filtering service
import { CalendarBlock, CalendarBlockType } from '@studioranotes/types';
import { Task, Course, Event } from '@studioranotes/types';
import { addHours, isWithinInterval } from 'date-fns';

interface ClinicalFilterConfig {
  courseId: string;
  professorName: string;
  showOnlyDueDates: boolean;
  showReflectionDeadlines: boolean;
  reflectionHoursAfterClinical: number;
}

// Default clinical filter configurations
const CLINICAL_CONFIGS: Record<string, ClinicalFilterConfig> = {
  'adult-health-ii-clinical': {
    courseId: 'adult-health-ii-clinical',
    professorName: 'Professor White',
    showOnlyDueDates: true,
    showReflectionDeadlines: true,
    reflectionHoursAfterClinical: 48
  },
  'pediatrics-clinical': {
    courseId: 'pediatrics-clinical', 
    professorName: '',
    showOnlyDueDates: false,
    showReflectionDeadlines: true,
    reflectionHoursAfterClinical: 48
  }
};

export class ClinicalFilterService {
  /**
   * Filter calendar blocks for clinical courses based on configuration
   */
  filterClinicalBlocks(
    blocks: CalendarBlock[],
    courses: Course[],
    filterConfig?: Partial<ClinicalFilterConfig>
  ): CalendarBlock[] {
    // Find clinical courses
    const clinicalCourses = courses.filter(course => 
      course.name.toLowerCase().includes('clinical') ||
      course.code.toLowerCase().includes('clinical')
    );

    if (clinicalCourses.length === 0) {
      return blocks; // No clinical courses, return all blocks
    }

    const filteredBlocks: CalendarBlock[] = [];
    
    clinicalCourses.forEach(course => {
      // Get configuration for this clinical course
      const config = this.getConfigForCourse(course, filterConfig);
      
      // Filter blocks for this clinical course
      const courseBlocks = blocks.filter(block => block.courseId === course.id);
      
      courseBlocks.forEach(block => {
        // Always include clinical time blocks
        if (block.type === 'clinical') {
          filteredBlocks.push(block);
          
          // Add reflection deadline if configured
          if (config.showReflectionDeadlines) {
            const reflectionBlock = this.createReflectionBlock(block, config);
            if (reflectionBlock) {
              filteredBlocks.push(reflectionBlock);
            }
          }
        }
        
        // Include due blocks if it's the actual due date
        else if (block.type === 'due' && config.showOnlyDueDates) {
          filteredBlocks.push(block);
        }
        
        // For non-clinical courses or when not filtering strictly
        else if (!config.showOnlyDueDates) {
          filteredBlocks.push(block);
        }
      });
    });
    
    // Add non-clinical course blocks
    const nonClinicalBlocks = blocks.filter(block => {
      const course = courses.find(c => c.id === block.courseId);
      return !course || (!course.name.toLowerCase().includes('clinical') && 
                        !course.code.toLowerCase().includes('clinical'));
    });
    
    filteredBlocks.push(...nonClinicalBlocks);
    
    return filteredBlocks;
  }

  /**
   * Get configuration for a specific clinical course
   */
  private getConfigForCourse(
    course: Course,
    customConfig?: Partial<ClinicalFilterConfig>
  ): ClinicalFilterConfig {
    // Check if there's a predefined config
    const courseKey = course.code.toLowerCase().replace(/\s+/g, '-');
    const defaultConfig = CLINICAL_CONFIGS[courseKey];
    
    // Merge with custom config if provided
    if (customConfig) {
      return { ...defaultConfig, ...customConfig };
    }
    
    // Return default config or create basic one
    return defaultConfig || {
      courseId: course.id,
      professorName: course.professor,
      showOnlyDueDates: true,
      showReflectionDeadlines: true,
      reflectionHoursAfterClinical: 48
    };
  }

  /**
   * Create a reflection deadline block after clinical
   */
  private createReflectionBlock(
    clinicalBlock: CalendarBlock,
    config: ClinicalFilterConfig
  ): CalendarBlock | null {
    const reflectionTime = addHours(
      new Date(clinicalBlock.endTime),
      config.reflectionHoursAfterClinical
    );
    
    return {
      id: `${clinicalBlock.id}-reflection`,
      type: 'due',
      title: 'Clinical Reflection Due',
      startTime: reflectionTime,
      endTime: addHours(reflectionTime, 1),
      courseId: clinicalBlock.courseId,
      description: `Reflection for clinical on ${new Date(clinicalBlock.startTime).toLocaleDateString()}`,
      completed: false,
      isDraggable: false,
      priority: 'high'
    };
  }

  /**
   * Check if a block should be shown based on clinical filtering rules
   */
  shouldShowBlock(
    block: CalendarBlock,
    course: Course | undefined,
    config?: Partial<ClinicalFilterConfig>
  ): boolean {
    // Not a clinical course, always show
    if (!course || (!course.name.toLowerCase().includes('clinical') && 
                    !course.code.toLowerCase().includes('clinical'))) {
      return true;
    }
    
    const filterConfig = this.getConfigForCourse(course, config);
    
    // Clinical blocks always shown
    if (block.type === 'clinical') {
      return true;
    }
    
    // Due blocks shown based on configuration
    if (block.type === 'due') {
      return filterConfig.showOnlyDueDates;
    }
    
    // Other blocks based on configuration
    return !filterConfig.showOnlyDueDates;
  }

  /**
   * Get clinical schedule pattern for a course
   */
  getClinicalSchedule(course: Course): Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string;
  }> {
    return course.schedule
      .filter(schedule => schedule.type === 'clinical')
      .map(schedule => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location || schedule.room
      }));
  }

  /**
   * Check if a professor matches the clinical filter
   */
  isProfessorMatch(professorName: string, filterProfessor: string): boolean {
    if (!filterProfessor) return true;
    
    const normalizedProfessor = professorName.toLowerCase().trim();
    const normalizedFilter = filterProfessor.toLowerCase().trim();
    
    // Check for exact match or partial match
    return normalizedProfessor.includes(normalizedFilter) ||
           normalizedFilter.includes(normalizedProfessor);
  }

  /**
   * Generate clinical-related blocks for a time period
   */
  generateClinicalBlocks(
    course: Course,
    startDate: Date,
    endDate: Date,
    config?: Partial<ClinicalFilterConfig>
  ): CalendarBlock[] {
    const blocks: CalendarBlock[] = [];
    const clinicalSchedule = this.getClinicalSchedule(course);
    const filterConfig = this.getConfigForCourse(course, config);
    
    // Generate blocks for each clinical session in the period
    // This would typically iterate through dates and create blocks
    // based on the clinical schedule pattern
    
    return blocks;
  }
}

// Create singleton instance
export const clinicalFilter = new ClinicalFilterService();