/**
 * Notification Service
 * Handles browser notifications for upcoming tasks and deadlines
 */

import { Task } from '@studioranotes/types';
import { format, differenceInMinutes, addMinutes } from 'date-fns';

export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  deadlineWarnings: boolean;
  studyBlockReminders: boolean;
  reminderTimes: number[]; // minutes before event
  soundEnabled: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private scheduledNotifications: Map<string, number> = new Map();
  private settings: NotificationSettings = {
    enabled: true,
    taskReminders: true,
    deadlineWarnings: true,
    studyBlockReminders: true,
    reminderTimes: [15, 60, 1440], // 15 min, 1 hour, 1 day
    soundEnabled: false
  };

  constructor() {
    this.init();
  }

  private async init() {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      await this.requestPermission();
    }
    
    this.permission = Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Re-schedule notifications if settings changed
    if (newSettings.reminderTimes || newSettings.enabled) {
      this.clearAllScheduled();
      // Re-schedule would be triggered by the store
    }
  }

  scheduleTaskNotifications(tasks: Task[]) {
    if (!this.settings.enabled || this.permission !== 'granted') {
      return;
    }

    // Clear existing scheduled notifications
    this.clearAllScheduled();

    const now = new Date();

    tasks.forEach(task => {
      // Schedule deadline notifications
      if (task.dueDate && this.settings.deadlineWarnings) {
        const dueDate = new Date(task.dueDate);
        
        this.settings.reminderTimes.forEach(minutesBefore => {
          const notifyTime = addMinutes(dueDate, -minutesBefore);
          
          if (notifyTime > now) {
            this.scheduleNotification(
              `task-deadline-${task.id}-${minutesBefore}`,
              notifyTime,
              {
                title: `⚠️ Deadline Approaching`,
                body: `"${task.title}" is due ${this.formatTimeUntil(minutesBefore)}`,
                tag: `deadline-${task.id}`,
                data: { taskId: task.id, type: 'deadline' }
              }
            );
          }
        });
      }

      // Schedule study block notifications
      if (task.scheduledBlocks && this.settings.studyBlockReminders) {
        task.scheduledBlocks.forEach(block => {
          const blockStart = new Date(block.startTime);
          
          // Notify 15 minutes before study block
          const notifyTime = addMinutes(blockStart, -15);
          
          if (notifyTime > now) {
            this.scheduleNotification(
              `task-block-${task.id}-${block.startTime}`,
              notifyTime,
              {
                title: `📚 Study Time Starting Soon`,
                body: `"${task.title}" scheduled in 15 minutes`,
                tag: `study-${task.id}`,
                data: { taskId: task.id, type: 'study', blockId: block.startTime }
              }
            );
          }
        });
      }
    });
  }

  private scheduleNotification(
    id: string,
    time: Date,
    options: {
      title: string;
      body: string;
      tag: string;
      data?: any;
    }
  ) {
    const delay = differenceInMinutes(time, new Date()) * 60 * 1000;
    
    if (delay <= 0) return;

    const timeoutId = window.setTimeout(() => {
      this.showNotification(options);
      this.scheduledNotifications.delete(id);
    }, delay);

    this.scheduledNotifications.set(id, timeoutId);
  }

  showNotification(options: {
    title: string;
    body: string;
    tag: string;
    data?: any;
  }) {
    if (this.permission !== 'granted') return;

    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag,
      requireInteraction: true,
      data: options.data
    });

    // Play sound if enabled
    if (this.settings.soundEnabled) {
      this.playNotificationSound();
    }

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      
      // Navigate to relevant view based on notification type
      if (options.data?.type === 'deadline') {
        window.location.href = '/tasks';
      } else if (options.data?.type === 'study') {
        window.location.href = '/schedule';
      }
      
      notification.close();
    };

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }

  private playNotificationSound() {
    // Audio disabled to prevent errors
    // Sound notifications can be added back with proper audio handling
    console.log('Notification sound triggered (currently disabled)');
  }

  private formatTimeUntil(minutes: number): string {
    if (minutes < 60) {
      return `in ${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
  }

  clearAllScheduled() {
    this.scheduledNotifications.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
  }

  // Test notification
  async testNotification() {
    const granted = await this.requestPermission();
    
    if (granted) {
      this.showNotification({
        title: '🎉 Notifications Enabled',
        body: 'You will receive reminders for upcoming tasks and deadlines',
        tag: 'test',
        data: { type: 'test' }
      });
    }
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }
}

export const notificationService = typeof window !== 'undefined' ? new NotificationService() : null as any;