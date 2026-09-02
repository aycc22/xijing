const REFRESH_QUERY = '_refresh'

let updateServiceWorker: (() => Promise<void>) | undefined

/** 由 main.ts 注入 vite-plugin-pwa 的 updateSW，便于手动触发更新。 */
export function initAppRefresh(updater: () => Promise<void>) {
  updateServiceWorker = updater
}

async function clearAppCaches(): Promise<void> {
  if (!('caches' in globalThis)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

async function refreshServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return

  try {
    await registration.update()
  } catch {
    /* 离线或网络异常时仍继续清缓存并刷新页面 */
  }

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (updateServiceWorker) {
    try {
      await updateServiceWorker()
    } catch {
      /* 已在上方尝试 update / skipWaiting */
    }
  }
}

function buildHardReloadUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.set(REFRESH_QUERY, String(Date.now()))
  return url.toString()
}

/** 清缓存、检查 Service Worker 更新，并硬刷新页面以加载最新部署。 */
export async function forceAppRefresh(): Promise<void> {
  await clearAppCaches()
  await refreshServiceWorker()
  window.location.replace(buildHardReloadUrl())
}
