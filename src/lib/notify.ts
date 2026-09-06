// Thin wrapper over the Web Notifications API. Shows OS-level notifications
// through the PWA service worker when available (works while the app is
// backgrounded), falling back to a page Notification. All calls are safe to
// make on unsupported browsers — they no-op.

const TITLE = 'Mess Manager'
const ICON = '/pwa-192x192.png'

export type NotifPermission = NotificationPermission | 'unsupported'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotifPermission {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

/** Ask the user to allow notifications. Must be triggered by a user gesture. */
export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Show an OS notification if permission has been granted; otherwise no-op. */
export async function showSystemNotification(body: string, title = TITLE): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const options: NotificationOptions = {
    body,
    icon: ICON,
    badge: ICON,
    tag: 'mess-manager',
    // let a burst of events replace rather than stack
    renotify: true,
  } as NotificationOptions
  try {
    if ('serviceWorker' in navigator) {
      // getRegistration() (unlike .ready) resolves immediately with undefined
      // when no SW is registered — e.g. in `npm run dev` — so this never hangs.
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, options)
        return
      }
    }
  } catch {
    /* fall through to the page Notification */
  }
  try {
    new Notification(title, options)
  } catch {
    /* constructor unavailable (e.g. Android Chrome requires the SW path) — ignore */
  }
}
