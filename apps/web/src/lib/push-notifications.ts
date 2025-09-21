import { useState, useEffect } from 'react'

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Get notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) {
    return 'denied'
  }
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Convert VAPID key from base64
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Register service worker and subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported')
  }

  // Check permission
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  // Subscribe to push notifications
  const subscribeOptions = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BKqH8kPx_8XyW1z3_4sLjKlLZ3Wr5qiWxGLNtNj0X2gTYPqRxbPepdqFLhqZGxZGIBX_hn6MMbnNPxPKVr1t5Hc'
    ),
  }

  try {
    const subscription = await registration.pushManager.subscribe(subscribeOptions)

    // Send subscription to server
    await saveSubscriptionToServer(subscription)

    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    throw error
  }
}

// Save subscription to server
async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  })

  if (!response.ok) {
    throw new Error('Failed to save subscription to server')
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await subscription.unsubscribe()

    // Remove subscription from server
    await removeSubscriptionFromServer(subscription)
  }
}

// Remove subscription from server
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  })
}

// Check if user is subscribed
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

// Schedule a notification
export async function scheduleNotification(
  title: string,
  options: {
    body?: string
    tag?: string
    data?: any
    scheduledTime?: Date
    recurring?: 'daily' | 'weekly' | 'monthly'
  }
): Promise<void> {
  const response = await fetch('/api/notifications/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      ...options,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to schedule notification')
  }
}

// Get scheduled notifications
export async function getScheduledNotifications(): Promise<any[]> {
  const response = await fetch('/api/notifications/scheduled')

  if (!response.ok) {
    throw new Error('Failed to get scheduled notifications')
  }

  return response.json()
}

// Cancel a scheduled notification
export async function cancelScheduledNotification(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/scheduled/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to cancel scheduled notification')
  }
}

// React hook for push notifications
export function usePushNotifications() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSupported(isPushNotificationSupported())
    setPermission(getNotificationPermission())

    // Check subscription status
    if (isPushNotificationSupported()) {
      isSubscribedToPushNotifications().then(setSubscribed)
    }
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      const subscription = await subscribeToPushNotifications()
      if (subscription) {
        setSubscribed(true)
        setPermission('granted')
      }
    } catch (error) {
      console.error('Failed to subscribe:', error)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      await unsubscribeFromPushNotifications()
      setSubscribed(false)
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    supported,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe,
    scheduleNotification,
    getScheduledNotifications,
    cancelScheduledNotification,
  }
}

// Notification templates
export const notificationTemplates = {
  assignmentDue: (assignment: any) => ({
    title: `Assignment Due: ${assignment.title}`,
    body: `Your assignment "${assignment.title}" is due ${assignment.dueIn}`,
    tag: `assignment-${assignment.id}`,
    data: {
      type: 'assignment',
      assignmentId: assignment.id,
      url: `/assignments/${assignment.id}`,
    },
  }),

  studyReminder: (session: any) => ({
    title: 'Study Session Reminder',
    body: `Time for your ${session.subject} study session (${session.duration})`,
    tag: `study-${session.id}`,
    data: {
      type: 'study',
      sessionId: session.id,
      url: `/study/${session.id}`,
    },
  }),

  classReminder: (classEvent: any) => ({
    title: `Class Starting Soon: ${classEvent.name}`,
    body: `${classEvent.name} starts in ${classEvent.timeUntil} at ${classEvent.location}`,
    tag: `class-${classEvent.id}`,
    data: {
      type: 'class',
      classId: classEvent.id,
      url: `/schedule`,
    },
  }),

  gradePosted: (course: any) => ({
    title: 'New Grade Posted',
    body: `A new grade has been posted for ${course.name}`,
    tag: `grade-${course.id}`,
    data: {
      type: 'grade',
      courseId: course.id,
      url: `/courses/${course.id}/grades`,
    },
  }),

  canvasUpdate: (update: any) => ({
    title: 'Canvas Update',
    body: update.message,
    tag: 'canvas-update',
    data: {
      type: 'canvas',
      url: '/dashboard',
    },
  }),
}