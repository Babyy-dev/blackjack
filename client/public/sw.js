self.addEventListener('push', function (event) {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Notification', body: event.data.text() }
  }
  const title = payload.title || 'Notification'
  const options = {
    body: payload.body || '',
    data: { url: payload.url || '/friends' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = event.notification.data && event.notification.data.url
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl)) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
      return undefined
    }),
  )
})
