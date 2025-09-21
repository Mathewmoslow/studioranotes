/**
 * Study Timer Service
 * Tracks study sessions, provides Pomodoro timer, and collects time data for ML optimization
 */

import { Task, TimeBlock } from '@studioranotes/types';
import { notificationService } from './notificationService';

export interface StudySession {
  id: string;
  taskId: string;
  taskTitle: string;
  courseId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  breaks: Break[];
  completed: boolean;
  productivity?: number; // 1-5 rating
  notes?: string;
}

export interface Break {
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface TimerSettings {
  sessionDuration: number; // default 25 minutes
  shortBreakDuration: number; // default 5 minutes
  longBreakDuration: number; // default 15 minutes
  sessionsBeforeLongBreak: number; // default 4
  autoStartBreaks: boolean;
  autoStartSessions: boolean;
  soundEnabled: boolean;
}

export interface TimeStatistics {
  totalStudyTime: number;
  averageSessionDuration: number;
  totalSessions: number;
  completionRate: number;
  productivityAverage: number;
  preferredStudyTimes: { hour: number; count: number }[];
  actualVsEstimated: { taskType: string; ratio: number }[];
}

class StudyTimerService {
  private currentSession: StudySession | null = null;
  private timer: number | null = null;
  private elapsedSeconds: number = 0;
  private isPaused: boolean = false;
  private sessions: StudySession[] = [];
  private settings: TimerSettings = {
    sessionDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartSessions: false,
    soundEnabled: true
  };
  private sessionCount: number = 0;
  private onTickCallbacks: ((time: number) => void)[] = [];
  private onStateChangeCallbacks: ((state: 'idle' | 'studying' | 'break' | 'paused') => void)[] = [];

  constructor() {
    this.loadSettings();
    this.loadSessions();
  }

  /**
   * Start a new study session
   */
  startSession(task: Task): StudySession {
    if (this.currentSession && !this.currentSession.endTime) {
      this.endSession();
    }

    const session: StudySession = {
      id: `session-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      courseId: task.courseId,
      startTime: new Date(),
      breaks: [],
      completed: false
    };

    this.currentSession = session;
    this.sessions.push(session);
    this.elapsedSeconds = 0;
    this.isPaused = false;
    
    this.startTimer();
    this.notifyStateChange('studying');
    
    // Schedule session end notification
    const sessionMinutes = this.settings.sessionDuration;
    setTimeout(() => {
      if (this.currentSession?.id === session.id && !this.isPaused) {
        this.onPomodoroComplete();
      }
    }, sessionMinutes * 60 * 1000);

    this.saveSessions();
    return session;
  }

  /**
   * End the current study session
   */
  endSession(productivity?: number, notes?: string): StudySession | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = new Date();
    this.currentSession.duration = Math.round(this.elapsedSeconds / 60);
    this.currentSession.completed = true;
    
    if (productivity) {
      this.currentSession.productivity = productivity;
    }
    
    if (notes) {
      this.currentSession.notes = notes;
    }

    this.stopTimer();
    this.saveSessions();
    this.notifyStateChange('idle');
    
    const completedSession = this.currentSession;
    this.currentSession = null;
    
    return completedSession;
  }

  /**
   * Pause/Resume the current session
   */
  togglePause(): boolean {
    if (!this.currentSession) return false;

    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.stopTimer();
      this.notifyStateChange('paused');
    } else {
      this.startTimer();
      this.notifyStateChange('studying');
    }
    
    return this.isPaused;
  }

  /**
   * Start a break
   */
  startBreak(isLongBreak: boolean = false): void {
    if (!this.currentSession) return;

    const breakDuration = isLongBreak 
      ? this.settings.longBreakDuration 
      : this.settings.shortBreakDuration;

    const breakStart = new Date();
    
    this.stopTimer();
    this.notifyStateChange('break');
    
    // Play sound if enabled
    if (this.settings.soundEnabled) {
      this.playSound('break');
    }

    // Show notification
    notificationService.showNotification({
      title: isLongBreak ? '☕ Long Break Time!' : '☕ Break Time!',
      body: `Take a ${breakDuration} minute break. You've earned it!`,
      tag: 'break',
      data: { type: 'break' }
    });

    // Auto-end break
    setTimeout(() => {
      if (this.currentSession) {
        const breakEnd = new Date();
        this.currentSession.breaks.push({
          startTime: breakStart,
          endTime: breakEnd,
          duration: breakDuration
        });
        
        this.onBreakComplete();
      }
    }, breakDuration * 60 * 1000);
  }

  /**
   * Called when a Pomodoro session completes
   */
  private onPomodoroComplete(): void {
    this.sessionCount++;
    
    // Play sound
    if (this.settings.soundEnabled) {
      this.playSound('complete');
    }

    // Show notification
    notificationService.showNotification({
      title: '🎉 Pomodoro Complete!',
      body: 'Great work! Time for a break.',
      tag: 'pomodoro-complete',
      data: { type: 'pomodoro-complete' }
    });

    // Determine break type
    const isLongBreak = this.sessionCount % this.settings.sessionsBeforeLongBreak === 0;
    
    if (this.settings.autoStartBreaks) {
      this.startBreak(isLongBreak);
    } else {
      this.notifyStateChange('idle');
    }
  }

  /**
   * Called when a break completes
   */
  private onBreakComplete(): void {
    // Play sound
    if (this.settings.soundEnabled) {
      this.playSound('break-end');
    }

    // Show notification
    notificationService.showNotification({
      title: '⏰ Break Over!',
      body: 'Ready to continue studying?',
      tag: 'break-over',
      data: { type: 'break-over' }
    });

    if (this.settings.autoStartSessions && this.currentSession) {
      this.startTimer();
      this.notifyStateChange('studying');
    } else {
      this.notifyStateChange('idle');
    }
  }

  /**
   * Start the internal timer
   */
  private startTimer(): void {
    if (this.timer) return;
    
    this.timer = window.setInterval(() => {
      this.elapsedSeconds++;
      this.notifyTick(this.elapsedSeconds);
    }, 1000);
  }

  /**
   * Stop the internal timer
   */
  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get statistics for completed sessions
   */
  getStatistics(dateRange?: { start: Date; end: Date }): TimeStatistics {
    let relevantSessions = this.sessions.filter(s => s.completed);
    
    if (dateRange) {
      relevantSessions = relevantSessions.filter(
        s => s.startTime >= dateRange.start && s.startTime <= dateRange.end
      );
    }

    if (relevantSessions.length === 0) {
      return {
        totalStudyTime: 0,
        averageSessionDuration: 0,
        totalSessions: 0,
        completionRate: 0,
        productivityAverage: 0,
        preferredStudyTimes: [],
        actualVsEstimated: []
      };
    }

    // Calculate total study time
    const totalStudyTime = relevantSessions.reduce(
      (sum, s) => sum + (s.duration || 0), 0
    );

    // Calculate average session duration
    const averageSessionDuration = totalStudyTime / relevantSessions.length;

    // Calculate completion rate
    const completionRate = (relevantSessions.length / this.sessions.length) * 100;

    // Calculate productivity average
    const sessionsWithProductivity = relevantSessions.filter(s => s.productivity);
    const productivityAverage = sessionsWithProductivity.length > 0
      ? sessionsWithProductivity.reduce((sum, s) => sum + (s.productivity || 0), 0) / sessionsWithProductivity.length
      : 0;

    // Calculate preferred study times
    const hourCounts: Map<number, number> = new Map();
    relevantSessions.forEach(s => {
      const hour = s.startTime.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    const preferredStudyTimes = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate actual vs estimated (would need task data)
    const actualVsEstimated: { taskType: string; ratio: number }[] = [];

    return {
      totalStudyTime,
      averageSessionDuration,
      totalSessions: relevantSessions.length,
      completionRate,
      productivityAverage,
      preferredStudyTimes,
      actualVsEstimated
    };
  }

  /**
   * Get time tracking data for ML optimization
   */
  getTimeTrackingData(): { 
    taskId: string; 
    estimatedMinutes: number; 
    actualMinutes: number; 
    productivity: number;
    timeOfDay: string;
    dayOfWeek: number;
  }[] {
    return this.sessions
      .filter(s => s.completed && s.duration)
      .map(s => ({
        taskId: s.taskId,
        estimatedMinutes: 0, // Would need to get from task
        actualMinutes: s.duration || 0,
        productivity: s.productivity || 3,
        timeOfDay: this.getTimeOfDay(s.startTime),
        dayOfWeek: s.startTime.getDay()
      }));
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Play sound effects
   */
  private playSound(type: 'complete' | 'break' | 'break-end'): void {
    // Audio disabled to prevent errors
    // Sound notifications can be added back with proper audio handling
    console.log(`Timer sound triggered: ${type} (currently disabled)`);
  }

  /**
   * Subscribe to timer ticks
   */
  onTick(callback: (time: number) => void): () => void {
    this.onTickCallbacks.push(callback);
    return () => {
      this.onTickCallbacks = this.onTickCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: 'idle' | 'studying' | 'break' | 'paused') => void): () => void {
    this.onStateChangeCallbacks.push(callback);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyTick(time: number): void {
    this.onTickCallbacks.forEach(cb => cb(time));
  }

  private notifyStateChange(state: 'idle' | 'studying' | 'break' | 'paused'): void {
    this.onStateChangeCallbacks.forEach(cb => cb(state));
  }

  /**
   * Update timer settings
   */
  updateSettings(newSettings: Partial<TimerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getSettings(): TimerSettings {
    return { ...this.settings };
  }

  getCurrentSession(): StudySession | null {
    return this.currentSession;
  }

  getElapsedTime(): number {
    return this.elapsedSeconds;
  }

  getSessions(): StudySession[] {
    return [...this.sessions];
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('studyTimerSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading timer settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('studyTimerSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  }

  private loadSessions(): void {
    try {
      const saved = localStorage.getItem('studySessions');
      if (saved) {
        this.sessions = JSON.parse(saved).map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined,
          breaks: s.breaks.map((b: any) => ({
            ...b,
            startTime: new Date(b.startTime),
            endTime: new Date(b.endTime)
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading study sessions:', error);
    }
  }

  private saveSessions(): void {
    try {
      localStorage.setItem('studySessions', JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Error saving study sessions:', error);
    }
  }
}

export const studyTimerService = new StudyTimerService();