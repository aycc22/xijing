import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forceAppRefresh, initAppRefresh } from './appRefresh'

describe('forceAppRefresh', () => {
  const replaceMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.com/app/?foo=1#/',
        origin: 'https://example.com',
        pathname: '/app/',
        search: '?foo=1',
        hash: '#/',
        replace: replaceMock,
      },
    })

    vi.stubGlobal('location', window.location)

    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache']),
      delete: vi.fn().mockResolvedValue(true),
    })

    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          update: vi.fn().mockResolvedValue(undefined),
          waiting: null,
        }),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    initAppRefresh(async () => {})
    replaceMock.mockReset()
  })

  it('clears caches, checks sw update, then hard reloads', async () => {
    const updater = vi.fn().mockResolvedValue(undefined)
    initAppRefresh(updater)

    await forceAppRefresh()

    expect(caches.keys).toHaveBeenCalled()
    expect(caches.delete).toHaveBeenCalledWith('workbox-precache')
    expect(navigator.serviceWorker.getRegistration).toHaveBeenCalled()
    expect(updater).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledOnce()

    const nextUrl = replaceMock.mock.calls[0][0] as string
    expect(nextUrl).toMatch(/^https:\/\/example\.com\/app\/\?foo=1&_refresh=\d+#\/$/)
  })
})
