import { computed, onMounted, onUnmounted, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

const DISMISS_KEY = 'xj-a2hs-dismissed'

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const media = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return media || ios
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const iOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function useInstallPrompt() {
  const deferred = ref<BeforeInstallPromptEvent | null>(null)
  const isStandalone = ref(false)
  const dismissed = ref(false)
  const guideOpen = ref(false)
  const platform = ref<InstallPlatform>('desktop')
  const installing = ref(false)

  function onBeforeInstall(e: Event) {
    e.preventDefault()
    deferred.value = e as BeforeInstallPromptEvent
  }

  function onInstalled() {
    deferred.value = null
    isStandalone.value = true
    guideOpen.value = false
  }

  onMounted(() => {
    isStandalone.value = detectStandalone()
    platform.value = detectPlatform()
    try {
      dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      dismissed.value = false
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    window.removeEventListener('appinstalled', onInstalled)
  })

  const visible = computed(() => !isStandalone.value && !dismissed.value)
  const canNativeInstall = computed(() => Boolean(deferred.value))

  async function install() {
    if (!deferred.value) {
      guideOpen.value = true
      return
    }
    installing.value = true
    try {
      await deferred.value.prompt()
      const { outcome } = await deferred.value.userChoice
      if (outcome === 'accepted') {
        deferred.value = null
        guideOpen.value = false
      } else {
        guideOpen.value = true
      }
    } catch {
      guideOpen.value = true
    } finally {
      installing.value = false
    }
  }

  function openGuide() {
    guideOpen.value = true
  }

  function closeGuide() {
    guideOpen.value = false
  }

  function dismiss() {
    dismissed.value = true
    guideOpen.value = false
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return {
    visible,
    canNativeInstall,
    platform,
    guideOpen,
    installing,
    isStandalone,
    install,
    openGuide,
    closeGuide,
    dismiss,
  }
}
