// Keeps an open tab from running stale code after a deploy.
//
// The PWA service worker (vite-plugin-pwa, registerType: 'autoUpdate') is built with
// skipWaiting + clientsClaim, so a newly deployed worker takes control of this tab as
// soon as it installs. But taking control does not reload the page — the tab keeps
// running the JS it already loaded, so a fresh deploy only appears on the *second*
// visit. That reads as "the update never went live".

export function reloadOnServiceWorkerUpdate(): void {
  if (!('serviceWorker' in navigator)) return

  // No controller yet means this is a first-ever visit: the worker claiming an
  // uncontrolled page is not an update, so don't reload for it.
  if (!navigator.serviceWorker.controller) return

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return // controllerchange can fire more than once
    reloading = true
    window.location.reload()
  })
}
