// Service Worker for StudiOra Notes Push Notifications

self.addEventListener('push', function(event) {
  if (!event.data) {
    return
  }

  const data = event.data.json()
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || '/',
      ...data.data
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'default',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'StudiOra Notes', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const notificationData = event.notification.data
  let targetUrl = notificationData.url || '/'

  // Handle action buttons
  if (event.action === 'view') {
    targetUrl = notificationData.url || '/'
  } else if (event.action === 'dismiss') {
    return // Just close the notification
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Background sync for offline support
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks())
  } else if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes())
  }
})

async function syncTasks() {
  try {
    const response = await fetch('/api/sync/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Get pending tasks from IndexedDB
      })
    })
    return response.json()
  } catch (error) {
    console.error('Failed to sync tasks:', error)
  }
}

async function syncNotes() {
  try {
    const response = await fetch('/api/sync/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Get pending notes from IndexedDB
      })
    })
    return response.json()
  } catch (error) {
    console.error('Failed to sync notes:', error)
  }
}

// Periodic background sync
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'update-check') {
    event.waitUntil(checkForUpdates())
  }
})

async function checkForUpdates() {
  try {
    const response = await fetch('/api/check-updates')
    const data = await response.json()

    if (data.hasUpdates) {
      // Show notification about updates
      self.registration.showNotification('New updates available', {
        body: data.message || 'Check your dashboard for new assignments and events',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'update-notification'
      })
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
  }
}

// Cache strategies for offline support
const CACHE_NAME = 'studioranotes-v1'
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache)
    })
  )
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // Cache hit - return response
      if (response) {
        return response
      }

      return fetch(event.request).then(function(response) {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then(function(cache) {
          // Don't cache POST requests or API calls
          if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
            cache.put(event.request, responseToCache)
          }
        })

        return response
      })
    }).catch(function() {
      // Return offline page if network fails
      return caches.match('/offline')
    })
  )
})