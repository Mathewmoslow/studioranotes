import { useEffect, useState } from 'react'
import { useScheduleStore } from '@/stores/useScheduleStore'

export class CanvasAutoSync {
  private syncInterval: NodeJS.Timeout | null = null
  private lastSyncTime: Date | null = null
  private syncInProgress = false

  // Sync every 30 minutes by default
  private SYNC_INTERVAL = 30 * 60 * 1000

  // Track failed sync attempts
  private failedAttempts = 0
  private MAX_FAILED_ATTEMPTS = 3

  constructor() {
    // Check if we should enable auto-sync
    const settings = localStorage.getItem('canvas-auto-sync-settings')
    if (settings) {
      const { enabled, interval } = JSON.parse(settings)
      if (enabled && interval) {
        this.SYNC_INTERVAL = interval
        this.start()
      }
    }
  }

  start() {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Run initial sync
    this.sync()

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.sync()
    }, this.SYNC_INTERVAL)

    // Also sync when the page becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Sync on page unload (best effort)
    window.addEventListener('beforeunload', this.handleUnload)
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('beforeunload', this.handleUnload)
  }

  private handleVisibilityChange = () => {
    if (!document.hidden && this.shouldSync()) {
      this.sync()
    }
  }

  private handleUnload = () => {
    // Best effort sync on unload
    if (this.shouldSync()) {
      // Use sendBeacon for better reliability
      const canvasToken = localStorage.getItem('canvasApiToken')
      if (canvasToken) {
        const data = {
          token: canvasToken,
          lastSync: this.lastSyncTime,
        }
        navigator.sendBeacon('/api/canvas/quick-sync', JSON.stringify(data))
      }
    }
  }

  private shouldSync(): boolean {
    // Don't sync if:
    // 1. Sync is already in progress
    // 2. We've had too many failed attempts
    // 3. We synced less than 5 minutes ago
    if (this.syncInProgress || this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      return false
    }

    if (this.lastSyncTime) {
      const timeSinceLastSync = Date.now() - this.lastSyncTime.getTime()
      if (timeSinceLastSync < 5 * 60 * 1000) {
        return false
      }
    }

    return true
  }

  async sync() {
    if (!this.shouldSync()) {
      return
    }

    const canvasToken = localStorage.getItem('canvasApiToken')
    const canvasUrl = localStorage.getItem('canvasUrl')

    if (!canvasToken || !canvasUrl) {
      console.log('Canvas credentials not found, skipping auto-sync')
      return
    }

    this.syncInProgress = true

    try {
      console.log('Starting Canvas auto-sync...')

      // Get current courses from the store
      const { courses, addTask, addEvent } = useScheduleStore.getState()
      const courseIds = courses.map(c => c.canvasId).filter(Boolean)

      if (courseIds.length === 0) {
        console.log('No Canvas courses to sync')
        return
      }

      // Fetch updates for each course
      const syncPromises = courseIds.map(async (courseId) => {
        try {
          // Fetch assignments
          const assignmentsRes = await fetch(
            `${canvasUrl}/api/v1/courses/${courseId}/assignments?per_page=100`,
            {
              headers: {
                'Authorization': `Bearer ${canvasToken}`,
              },
            }
          )

          if (assignmentsRes.ok) {
            const assignments = await assignmentsRes.json()
            const course = courses.find(c => c.canvasId === courseId)

            // Add new assignments as tasks
            for (const assignment of assignments) {
              if (assignment.due_at) {
                const existingTask = useScheduleStore.getState().tasks.find(
                  t => t.canvasId === assignment.id
                )

                if (!existingTask) {
                  addTask({
                    id: `canvas-assignment-${assignment.id}`,
                    canvasId: assignment.id,
                    title: assignment.name,
                    description: assignment.description || '',
                    dueDate: new Date(assignment.due_at),
                    courseId: course?.id || '',
                    courseName: course?.name || '',
                    priority: 'medium',
                    status: 'pending',
                    estimatedTime: 2,
                    type: 'assignment',
                  })
                }
              }
            }
          }

          // Fetch calendar events
          const eventsRes = await fetch(
            `${canvasUrl}/api/v1/courses/${courseId}/calendar_events?per_page=100`,
            {
              headers: {
                'Authorization': `Bearer ${canvasToken}`,
              },
            }
          )

          if (eventsRes.ok) {
            const events = await eventsRes.json()
            const course = courses.find(c => c.canvasId === courseId)

            // Add new events
            for (const event of events) {
              if (event.start_at || event.all_day_date) {
                const existingEvent = useScheduleStore.getState().events.find(
                  e => e.canvasId === event.id
                )

                if (!existingEvent) {
                  const startDate = new Date(event.start_at || event.all_day_date)
                  const endDate = event.end_at ? new Date(event.end_at) : new Date(startDate.getTime() + 60 * 60 * 1000)

                  addEvent({
                    id: `canvas-event-${event.id}`,
                    canvasId: event.id,
                    title: event.title,
                    description: event.description || '',
                    startTime: startDate,
                    endTime: endDate,
                    courseId: course?.id || '',
                    courseName: course?.name || '',
                    type: 'class',
                    location: event.location_name || '',
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to sync course ${courseId}:`, error)
        }
      })

      await Promise.all(syncPromises)

      this.lastSyncTime = new Date()
      this.failedAttempts = 0
      console.log('Canvas auto-sync completed successfully')

      // Update last sync time in localStorage
      localStorage.setItem('canvas-last-sync', this.lastSyncTime.toISOString())

      // Notify UI of sync completion
      window.dispatchEvent(new CustomEvent('canvas-sync-complete', {
        detail: { timestamp: this.lastSyncTime }
      }))
    } catch (error) {
      console.error('Canvas auto-sync failed:', error)
      this.failedAttempts++

      // If we've failed too many times, stop auto-sync
      if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        console.warn('Auto-sync disabled due to repeated failures')
        this.stop()

        // Notify UI of sync failure
        window.dispatchEvent(new CustomEvent('canvas-sync-failed', {
          detail: { error: 'Auto-sync disabled due to repeated failures' }
        }))
      }
    } finally {
      this.syncInProgress = false
    }
  }

  // Public methods for controlling auto-sync
  setInterval(minutes: number) {
    this.SYNC_INTERVAL = minutes * 60 * 1000

    // Save settings
    localStorage.setItem('canvas-auto-sync-settings', JSON.stringify({
      enabled: true,
      interval: this.SYNC_INTERVAL
    }))

    // Restart with new interval
    this.stop()
    this.start()
  }

  getStatus() {
    return {
      enabled: this.syncInterval !== null,
      lastSync: this.lastSyncTime,
      interval: this.SYNC_INTERVAL,
      failedAttempts: this.failedAttempts,
      syncInProgress: this.syncInProgress,
    }
  }

  enable() {
    localStorage.setItem('canvas-auto-sync-settings', JSON.stringify({
      enabled: true,
      interval: this.SYNC_INTERVAL
    }))
    this.start()
  }

  disable() {
    localStorage.setItem('canvas-auto-sync-settings', JSON.stringify({
      enabled: false,
      interval: this.SYNC_INTERVAL
    }))
    this.stop()
  }
}

// Create singleton instance
let autoSyncInstance: CanvasAutoSync | null = null

export function getCanvasAutoSync(): CanvasAutoSync {
  if (!autoSyncInstance) {
    autoSyncInstance = new CanvasAutoSync()
  }
  return autoSyncInstance
}

// Hook for React components
export function useCanvasAutoSync() {
  const [status, setStatus] = useState(() => getCanvasAutoSync().getStatus())

  useEffect(() => {
    const handleSyncComplete = () => {
      setStatus(getCanvasAutoSync().getStatus())
    }

    const handleSyncFailed = () => {
      setStatus(getCanvasAutoSync().getStatus())
    }

    window.addEventListener('canvas-sync-complete', handleSyncComplete)
    window.addEventListener('canvas-sync-failed', handleSyncFailed)

    // Check status every minute
    const interval = setInterval(() => {
      setStatus(getCanvasAutoSync().getStatus())
    }, 60000)

    return () => {
      window.removeEventListener('canvas-sync-complete', handleSyncComplete)
      window.removeEventListener('canvas-sync-failed', handleSyncFailed)
      clearInterval(interval)
    }
  }, [])

  return {
    status,
    enable: () => getCanvasAutoSync().enable(),
    disable: () => getCanvasAutoSync().disable(),
    setInterval: (minutes: number) => getCanvasAutoSync().setInterval(minutes),
    syncNow: () => getCanvasAutoSync().sync(),
  }
}