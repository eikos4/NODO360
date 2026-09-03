/* Service worker FCM — config llega por query al registrar */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

try {
  const params = new URL(self.location).searchParams;
  const apiKey = params.get('apiKey');
  const projectId = params.get('projectId');
  const messagingSenderId = params.get('messagingSenderId');
  const appId = params.get('appId');
  if (apiKey && projectId && messagingSenderId && appId && !firebase.apps.length) {
    firebase.initializeApp({
      apiKey,
      projectId,
      messagingSenderId,
      appId,
      authDomain: params.get('authDomain') || undefined,
      storageBucket: params.get('storageBucket') || undefined,
    });
    firebase.messaging();
  }
} catch (e) {
  console.warn('[nodo360] FCM SW init', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/emergencia-respuesta';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
