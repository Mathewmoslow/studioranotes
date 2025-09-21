// Update src/services/dataLoader.ts to ensure tasks have estimated hours
import { nursingCourses, nursingScheduleItems } from '../utils/nursingSampleData';
import { useScheduleStore } from '../stores/useScheduleStore';
import { parseISO, setHours, setMinutes } from 'date-fns';

export class DataLoader {
  static loadNursingData() {
    console.log('=== LOADING NURSING DATA ===');
    const store = useScheduleStore.getState();
    
    // Clear existing data first
    this.clearAllData();
    
    // Load courses
    this.loadCourses();
    console.log('Courses loaded:', store.courses.length);
    
    // Process schedule items
    this.processScheduleItems();
    console.log('Items processed');
    
    // After loading, check what we have
    setTimeout(() => {
      const newState = useScheduleStore.getState();
      console.log('Final state:');
      console.log('- Courses:', newState.courses.length);
      console.log('- Events:', newState.events.length);
      console.log('- Tasks:', newState.tasks.length);
      console.log('- Time blocks:', newState.timeBlocks.length);
      
      // Trigger auto-scheduling
      console.log('Triggering auto-schedule...');
      newState.rescheduleAllTasks();
    }, 1000);
  }
  
  private static clearAllData() {
    const store = useScheduleStore.getState();
    
    // Clear existing data
    store.courses.forEach(course => store.deleteCourse(course.id));
    store.events.forEach(event => store.deleteEvent(event.id));
    store.tasks.forEach(task => store.deleteTask(task.id));
    
    // Reset store
    useScheduleStore.setState({
      courses: [],
      tasks: [],
      events: [],
      timeBlocks: []
    });
  }
  
  private static loadCourses() {
    const store = useScheduleStore.getState();
    
    nursingCourses.forEach(courseData => {
      const courseCode = courseData.code;
      const schedule = this.getCourseSchedule(courseCode);
      
      store.addCourse({
        name: courseData.name,
        code: courseData.code,
        professor: courseData.professor,
        credits: courseData.credits,
        color: courseData.color,
        schedule: schedule
      });
    });
    
    console.log('Added courses:', nursingCourses.map(c => c.code));
  }
  
  private static getCourseSchedule(courseCode: string) {
    switch(courseCode) {
      case 'NURS310':
        return [
          { dayOfWeek: 2, startTime: '09:00', endTime: '12:05', type: 'lecture' as const },
          { dayOfWeek: 3, startTime: '07:00', endTime: '17:00', type: 'lab' as const }
        ];
      case 'NURS315':
        return [
          { dayOfWeek: 3, startTime: '13:00', endTime: '14:30', type: 'lecture' as const }
        ];
      case 'NURS335':
        return [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', type: 'lecture' as const }
        ];
      case 'NURS330':
        return [
          { dayOfWeek: 0, startTime: '09:00', endTime: '12:00', type: 'lecture' as const },
          { dayOfWeek: 1, startTime: '07:00', endTime: '17:00', type: 'lab' as const }
        ];
      default:
        return [];
    }
  }
  
  private static processScheduleItems() {
    const store = useScheduleStore.getState();
    
    // Define event types that create calendar events (not tasks)
    const eventTypes = ['Lecture', 'Clinical', 'Lab', 'Simulation', 'Holiday', 'Review', 'Exam'];
    
    let tasksCreated = 0;
    let eventsCreated = 0;
    
    nursingScheduleItems.forEach(item => {
      const courseCode = this.mapCourseCode(item.course);
      const course = store.courses.find(c => c.code === courseCode);
      
      if (!course) {
        console.warn(`Course not found for ${item.course}`);
        return;
      }
      
      const itemDate = item.date === 'TBD' ? new Date(2025, 7, 15) : parseISO(item.date);
      
      if (eventTypes.includes(item.type)) {
        // Create EVENT (scheduled class time)
        this.createEvent(item, course.id, itemDate);
        eventsCreated++;
      } else {
        // Create TASK (needs "DO" time scheduled)
        this.createTask(item, course.id, itemDate);
        tasksCreated++;
      }
    });
    
    console.log(`Created ${eventsCreated} events and ${tasksCreated} tasks`);
  }
  
  private static mapCourseCode(csvCourse: string): string {
    const mapping: Record<string, string> = {
      'Adult_310': 'NURS310',
      'Gerontology_315': 'NURS315',
      'NCLEX_335': 'NURS335',
      'OBGYN_330': 'NURS330'
    };
    return mapping[csvCourse] || csvCourse;
  }
  
  private static parseDuration(duration: string): number {
    if (!duration || duration === 'N/A' || duration === '0' || duration === 'TBD') {
      return 0;
    }
    
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours + minutes/60 + seconds/3600;
    } else if (parts.length === 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours + minutes/60;
    }
    
    return 0;
  }
  
  private static estimateHours(type: string): number {
    const estimates: Record<string, number> = {
      'Assignment': 4,
      'Quiz': 2,
      'Reading': 3,
      'Video': 1,
      'Activity': 2,
      'Project': 10,
      'Simulation': 3,
    };
    return estimates[type] || 3;
  }
  
  private static estimateComplexity(type: string, duration: number): 1 | 2 | 3 | 4 | 5 {
    if (type === 'Quiz') return 2;
    if (type === 'Assignment' || type === 'Activity') return 3;
    if (type === 'Reading' || type === 'Video') return 2;
    if (type === 'Project') return 4;
    
    if (duration > 4) return 4;
    if (duration > 2) return 3;
    return 2;
  }
  
  private static createEvent(item: any, courseId: string, date: Date) {
    const store = useScheduleStore.getState();
    const duration = this.parseDuration(item.duration) || this.getDefaultEventDuration(item.type);
    
    let startHour = 9;
    if (item.type === 'Clinical') {
      startHour = 7;
    } else if (item.type === 'Exam') {
      startHour = 9;
    } else if (item.type === 'Lab') {
      startHour = 13;
    } else if (item.type === 'Simulation') {
      startHour = 13;
    }
    
    const startTime = setMinutes(setHours(date, startHour), 0);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    
    store.addEvent({
      title: item.title.replace(/_/g, ' '),
      type: this.mapEventType(item.type),
      courseId,
      startTime,
      endTime,
      location: this.getLocation(item.type),
      description: `${item.type} for ${item.course.replace('_', ' ')}`
    });
  }
  
  private static createTask(item: any, courseId: string, dueDate: Date) {
    const store = useScheduleStore.getState();
    
    // Get or estimate duration
    let estimatedHours = this.parseDuration(item.duration);
    if (estimatedHours === 0) {
      estimatedHours = this.estimateHours(item.type);
    }
    
    // Ensure minimum hours for meaningful scheduling
    if (estimatedHours < 1) {
      estimatedHours = 2; // Minimum 2 hours for any task
    }
    
    const taskType = this.mapTaskType(item.type);
    const complexity = this.estimateComplexity(item.type, estimatedHours);
    
    console.log(`Creating task: ${item.title}, ${estimatedHours}h, complexity: ${complexity}`);
    
    store.addTask({
      title: item.title.replace(/_/g, ' '),
      courseId,
      type: taskType,
      dueDate,
      estimatedHours,
      complexity,
      description: `${item.type} for ${item.course.replace('_', ' ')}`,
      isHardDeadline: true,
      status: 'not-started'
    });
  }
  
  private static mapTaskType(type: string): 'assignment' | 'project' | 'reading' | 'exam' | 'lab' {
    switch(type.toLowerCase()) {
      case 'quiz':
        return 'exam';
      case 'assignment':
      case 'activity':
        return 'assignment';
      case 'reading':
      case 'video':
        return 'reading';
      case 'project':
        return 'project';
      default:
        return 'assignment';
    }
  }
  
  private static mapEventType(type: string): 'lecture' | 'clinical' | 'lab' | 'exam' | 'simulation' | 'review' | 'deadline' {
    switch(type.toLowerCase()) {
      case 'lecture': return 'lecture';
      case 'clinical': return 'clinical';
      case 'lab': return 'lab';
      case 'exam': return 'exam';
      case 'simulation': return 'simulation';
      case 'review': return 'review';
      default: return 'lecture';
    }
  }
  
  private static getDefaultEventDuration(type: string): number {
    const durations: Record<string, number> = {
      'Clinical': 10,
      'Exam': 2,
      'Lecture': 3,
      'Lab': 4,
      'Simulation': 3.5,
      'Review': 2,
    };
    return durations[type] || 2;
  }
  
  private static getLocation(type: string): string {
    const locationMap: Record<string, string> = {
      'Clinical': 'Hospital',
      'Lab': 'Skills Lab',
      'Exam': 'Testing Center',
      'Simulation': 'Simulation Lab',
      'Lecture': 'Classroom',
      'Review': 'Study Room'
    };
    return locationMap[type] || 'TBD';
  }
}