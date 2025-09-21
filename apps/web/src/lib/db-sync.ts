import { debounce } from 'lodash'

interface SyncState {
  courses: any[]
  tasks: any[]
  notes: any[]
  studyBlocks: any[]
  preferences: any
  onboardingCompleted: boolean
}

class DatabaseSync {
  private syncInProgress = false
  private syncQueue: SyncState | null = null
  private lastSyncTime: Date | null = null

  // Debounced sync function to prevent too many API calls
  private debouncedSync = debounce(async (data: SyncState) => {
    if (this.syncInProgress) {
      this.syncQueue = data
      return
    }

    try {
      this.syncInProgress = true

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()
      this.lastSyncTime = new Date()
      console.log('✅ Data synced to database:', result)

      // If there's a queued sync, process it
      if (this.syncQueue) {
        const queuedData = this.syncQueue
        this.syncQueue = null
        this.syncInProgress = false
        this.debouncedSync(queuedData)
      } else {
        this.syncInProgress = false
      }
    } catch (error) {
      console.error('❌ Sync error:', error)
      this.syncInProgress = false
    }
  }, 2000) // 2 second debounce

  // Sync data to database
  async syncToDatabase(data: SyncState) {
    this.debouncedSync(data)
  }

  // Load data from database
  async loadFromDatabase(): Promise<SyncState | null> {
    try {
      const response = await fetch('/api/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load data')
      }

      const data = await response.json()
      console.log('✅ Data loaded from database')
      return data
    } catch (error) {
      console.error('❌ Load error:', error)
      return null
    }
  }

  // Check if sync is needed
  shouldSync(): boolean {
    if (!this.lastSyncTime) return true
    const fiveMinutes = 5 * 60 * 1000
    return Date.now() - this.lastSyncTime.getTime() > fiveMinutes
  }

  // Force immediate sync
  async forceSync(data: SyncState) {
    this.debouncedSync.cancel()
    await this.syncToDatabase(data)
  }
}

// Create singleton instance
export const dbSync = new DatabaseSync()

// Helper hook for React components
import { useEffect, useRef } from 'react'
import { useScheduleStore } from '@/stores/useScheduleStore'

export function useDatabaseSync() {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const {
    courses,
    tasks,
    timeBlocks,
    events,
    preferences,
    settings
  } = useScheduleStore()

  // Initial load from database
  useEffect(() => {
    const loadData = async () => {
      const data = await dbSync.loadFromDatabase()

      if (data && data.courses) {
        // Update store with database data
        useScheduleStore.setState({
          courses: data.courses,
          tasks: data.tasks
        })
      }
    }

    loadData()
  }, [])

  // Auto-sync to database on changes
  useEffect(() => {
    const syncData: SyncState = {
      courses,
      tasks,
      notes: [],
      studyBlocks: timeBlocks,
      preferences,
      onboardingCompleted: true
    }

    dbSync.syncToDatabase(syncData)
  }, [courses, tasks, timeBlocks, preferences])

  // Periodic sync every 5 minutes
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (dbSync.shouldSync()) {
        const syncData: SyncState = {
          courses,
          tasks,
          notes: [],
          studyBlocks: timeBlocks,
          preferences,
          onboardingCompleted: true
        }
        dbSync.syncToDatabase(syncData)
      }
    }, 5 * 60 * 1000)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [courses, tasks, timeBlocks, preferences])

  // Sync before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const syncData: SyncState = {
        courses,
        tasks,
        notes: [],
        studyBlocks: timeBlocks,
        preferences,
        onboardingCompleted: true
      }
      dbSync.forceSync(syncData)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [courses, tasks, timeBlocks, preferences])

  return {
    syncToDatabase: () => {
      const syncData: SyncState = {
        courses,
        tasks,
        notes: [],
        studyBlocks: timeBlocks,
        preferences,
        onboardingCompleted: true
      }
      return dbSync.syncToDatabase(syncData)
    },
    loadFromDatabase: dbSync.loadFromDatabase.bind(dbSync),
    forceSync: () => {
      const syncData: SyncState = {
        courses,
        tasks,
        notes: [],
        studyBlocks: timeBlocks,
        preferences,
        onboardingCompleted: true
      }
      return dbSync.forceSync(syncData)
    }
  }
}