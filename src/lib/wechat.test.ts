import { describe, expect, it } from 'vitest'
import {
  buildMpOAuthUrl,
  buildOpenQrConnectUrl,
  isWechatBrowser,
  wechatRedirectUri,
} from './wechat'

describe('isWechatBrowser', () => {
  it('detects MicroMessenger UA', () => {
    expect(isWechatBrowser('Mozilla/5.0 MicroMessenger/8.0.0')).toBe(true)
    expect(isWechatBrowser('Mozilla/5.0 (iPhone) Safari')).toBe(false)
  })
})

describe('buildOpenQrConnectUrl', () => {
  it('builds qrconnect URL with encoded redirect and state', () => {
    const url = buildOpenQrConnectUrl(
      'wxAPPID',
      'https://example.com/repo/',
      'state-1',
    )
    expect(url).toContain('https://open.weixin.qq.com/connect/qrconnect?')
    expect(url).toContain('appid=wxAPPID')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Frepo%2F')
    expect(url).toContain('scope=snsapi_login')
    expect(url).toContain('state=state-1')
    expect(url.endsWith('#wechat_redirect')).toBe(true)
  })
})

describe('buildMpOAuthUrl', () => {
  it('builds mp authorize URL', () => {
    const url = buildMpOAuthUrl('wxMP', 'https://example.com/', 's2')
    expect(url).toContain('https://open.weixin.qq.com/connect/oauth2/authorize?')
    expect(url).toContain('scope=snsapi_userinfo')
    expect(url).toContain('appid=wxMP')
  })
})

describe('wechatRedirectUri', () => {
  it('returns a URI ending with slash', () => {
    const uri = wechatRedirectUri()
    expect(uri.endsWith('/')).toBe(true)
  })
})
