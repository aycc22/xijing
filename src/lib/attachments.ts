export interface CaseAttachment {
  type: string
  id?: string
  description?: string
  url?: string
}

export const DEFAULT_EXAM_ASSETS_BASE = '/data/exams/2022-isec/images'

/** 为站点根路径静态资源加上 Vite `BASE_URL`（如 GitHub Pages 项目站的 `/xijing/`） */
export function withBaseUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  if (!path.startsWith('/')) return path
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/') return path
  return `${base.replace(/\/$/, '')}${path}`
}

export function resolveAttachmentUrl(
  attachment: CaseAttachment,
  assetsBase = DEFAULT_EXAM_ASSETS_BASE,
): string | null {
  let resolved: string | null = null
  if (attachment.url?.trim()) resolved = attachment.url.trim()
  else if (attachment.id?.trim())
    resolved = `${assetsBase.replace(/\/$/, '')}/${attachment.id.trim()}.svg`
  return resolved ? withBaseUrl(resolved) : null
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
