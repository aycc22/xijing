export interface CaseAttachment {
  type: string
  id?: string
  description?: string
  url?: string
}

export const DEFAULT_EXAM_ASSETS_BASE = '/data/exams/2022-isec/images'

/** 已知真题配图的文件后缀（fig1-2 为文字规则示意，仍为 svg） */
const KNOWN_ATTACHMENT_EXTENSIONS: Record<string, string> = {
  'fig1-1': 'png',
  'fig1-2': 'svg',
  'fig2-1': 'png',
  'fig3-1': 'png',
  'fig3-2': 'png',
}

export function appBasePath(): string {
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/') return ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/** 解析为可请求的绝对 URL（兼容 GitHub Pages 子路径与 iOS PWA 独立模式） */
export function toAbsoluteAssetUrl(path: string): string {
  if (!path?.trim()) return path
  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const basePath = appBasePath()
  let pathname = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  if (basePath) {
    const alreadyPrefixed =
      pathname === basePath || pathname.startsWith(`${basePath}/`)
    if (!alreadyPrefixed) pathname = `${basePath}${pathname}`
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${pathname}`
  }
  return pathname
}

/** @deprecated 请优先使用 toAbsoluteAssetUrl；保留别名便于现有调用 */
export function withBaseUrl(path: string): string {
  return toAbsoluteAssetUrl(path)
}

function attachmentExtension(attachment: CaseAttachment): string {
  const fromUrl = attachment.url?.trim().match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromUrl) return fromUrl.toLowerCase()
  if (attachment.id?.trim()) {
    return KNOWN_ATTACHMENT_EXTENSIONS[attachment.id.trim()] ?? 'png'
  }
  return 'png'
}

export function resolveAttachmentUrl(
  attachment: CaseAttachment,
  assetsBase = DEFAULT_EXAM_ASSETS_BASE,
): string | null {
  let resolved: string | null = null
  if (attachment.url?.trim()) resolved = attachment.url.trim()
  else if (attachment.id?.trim()) {
    const ext = attachmentExtension(attachment)
    resolved = `${assetsBase.replace(/\/$/, '')}/${attachment.id.trim()}.${ext}`
  }
  return resolved ? toAbsoluteAssetUrl(resolved) : null
}

export function normalizeAttachments(
  raw: unknown,
  assetsBase = DEFAULT_EXAM_ASSETS_BASE,
): CaseAttachment[] {
  if (!Array.isArray(raw)) return []
  const items: CaseAttachment[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const type = typeof row.type === 'string' ? row.type : 'image'
    const id = typeof row.id === 'string' ? row.id : undefined
    const description = typeof row.description === 'string' ? row.description : undefined
    const url = typeof row.url === 'string' ? row.url : undefined
    const normalized: CaseAttachment = { type, id, description, url }
    const resolved = resolveAttachmentUrl(normalized, assetsBase)
    if (resolved) normalized.url = resolved
    items.push(normalized)
  }
  return items
}

/** 兼容旧数据：从 case_material 中移除导入时写入的配图占位文字 */
export function stripAttachmentPlaceholders(material: string | null | undefined): string {
  if (!material) return ''
  return material
    .replace(/\n*【配图\s+[^】]+】[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
