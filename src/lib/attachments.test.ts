import { describe, expect, it } from 'vitest'
import {
  normalizeAttachments,
  resolveAttachmentUrl,
  stripAttachmentPlaceholders,
  withBaseUrl,
} from './attachments'

describe('attachments', () => {
  it('resolves url from attachment id', () => {
    expect(resolveAttachmentUrl({ type: 'image', id: 'fig1-1' })).toBe(
      '/data/exams/2022-isec/images/fig1-1.svg',
    )
  })

  it('keeps explicit url', () => {
    expect(
      resolveAttachmentUrl({ type: 'image', id: 'fig1-1', url: '/custom/fig1-1.png' }),
    ).toBe('/custom/fig1-1.png')
  })

  it('leaves absolute http urls unchanged', () => {
    expect(withBaseUrl('https://cdn.example.com/fig.png')).toBe('https://cdn.example.com/fig.png')
  })

  it('normalizes raw attachment array', () => {
    const items = normalizeAttachments([
      { type: 'image', id: 'fig2-1', description: 'ls -l 输出' },
    ])
    expect(items).toHaveLength(1)
    expect(items[0].url).toBe('/data/exams/2022-isec/images/fig2-1.svg')
  })

  it('strips legacy placeholder lines from case material', () => {
    const material = `已知某公司网络环境结构……

【配图 fig1-1】网络拓扑结构图（DMZ区、内网办公区、生产区）
【配图 fig1-2】iptables 默认过滤规则（INPUT/FORWARD/OUTPUT 链）`
    expect(stripAttachmentPlaceholders(material)).toBe('已知某公司网络环境结构……')
  })
})
